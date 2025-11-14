/**
 * 员工视图仪表板指标
 */

export async function getEmployeeMetrics(env, user, ym, today) {
  const res = {
    myHours: null,
    myTasks: { items: [], counts: { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 } },
    myLeaves: null,
    recentActivities: [],
    notifications: [],
    receiptsPendingTasks: []
  };
  
  // Hours
  try {
    const h = await env.DATABASE.prepare(
      `SELECT 
          SUM(hours) AS total,
          SUM(CASE WHEN CAST(work_type AS INTEGER) = 1 THEN hours ELSE 0 END) AS normal,
          SUM(CASE WHEN CAST(work_type AS INTEGER) >= 2 THEN hours ELSE 0 END) AS overtime
       FROM Timesheets 
       WHERE is_deleted = 0 AND user_id = ? AND substr(work_date,1,7) = ?`
    ).bind(String(user.user_id), ym).first();
    
    const total = Number(h?.total || 0);
    const normal = Number(h?.normal || 0);
    const overtime = Number(h?.overtime || 0);
    const target = 160;
    const completionRate = target ? Math.round((total / target) * 1000) / 10 : 0;
    
    res.myHours = { month: ym, total, normal, overtime, targetHours: target, completionRate };
  } catch (_) {}
  
  // Tasks
  try {
    const rows = await env.DATABASE.prepare(
      `SELECT task_id, COALESCE(task_description, task_type) as task_name, due_date, status, related_sop_id, client_specific_sop_id,
              status_note, blocker_reason, overdue_reason
       FROM ActiveTasks
       WHERE is_deleted = 0 AND assignee_user_id = ? AND status IN ('pending','in_progress')
       ORDER BY COALESCE(due_date, '9999-12-31') ASC LIMIT 10`
    ).bind(String(user.user_id)).all();
    
    const items = (rows?.results || []).map(r => {
      const due = r.due_date || null;
      let urgency = 'normal';
      let daysUntilDue = null;
      let daysOverdue = null;
      
      if (due) {
        const d = new Date(due);
        const now = new Date();
        const delta = Math.floor((d.getTime() - now.getTime()) / 86400000);
        daysUntilDue = delta;
        if (delta < 0) {
          urgency = 'overdue';
          daysOverdue = -delta;
        } else if (delta <= 3) {
          urgency = 'urgent';
        }
      }
      
      return {
        id: r.task_id,
        name: r.task_name,
        dueDate: due,
        status: r.status,
        urgency,
        daysUntilDue,
        daysOverdue,
        hasSop: !!(r.related_sop_id || r.client_specific_sop_id),
        statusNote: r.status_note || null,
        blockerReason: r.blocker_reason || null,
        overdueReason: r.overdue_reason || null
      };
    });
    
    const counts = { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 };
    for (const it of items) {
      if (it.status === 'pending') counts.pending++;
      if (it.status === 'in_progress') counts.inProgress++;
      if (it.urgency === 'overdue') counts.overdue++;
      if (typeof it.daysUntilDue === 'number' && it.daysUntilDue >= 0 && it.daysUntilDue <= 3) counts.dueSoon++;
    }
    
    res.myTasks = { items, counts };
  } catch (_) {}
  
  // Leaves
  try {
    const rows = await env.DATABASE.prepare(
      `SELECT leave_type AS type, remain AS remaining, total, used 
       FROM LeaveBalances 
       WHERE user_id = ? AND leave_type != 'comp'`
    ).bind(String(user.user_id)).all();
    
    const bal = { annual: 0, sick: 0, compHours: 0 };
    for (const r of (rows?.results || [])) {
      const t = (r.type || '').toLowerCase();
      if (t === 'annual') bal.annual = Number(r.remaining || 0);
      else if (t === 'sick') bal.sick = Number(r.remaining || 0);
    }
    
    const compRow = await env.DATABASE.prepare(
      `SELECT SUM(hours_remaining) as total 
       FROM CompensatoryLeaveGrants 
       WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
    ).bind(String(user.user_id)).first();
    bal.compHours = Number(compRow?.total || 0);
    
    const recentRows = await env.DATABASE.prepare(
      `SELECT leave_type AS type, start_date, end_date, amount, status 
       FROM LeaveRequests 
       WHERE user_id = ? AND is_deleted = 0 
       ORDER BY submitted_at DESC LIMIT 3`
    ).bind(String(user.user_id)).all();
    
    const recent = (recentRows?.results || []).map(r => ({
      type: r.type,
      startDate: r.start_date,
      days: Number(r.amount || 0),
      status: r.status
    }));
    
    res.myLeaves = { balances: bal, recent };
  } catch (_) {}
  
  // Receipts pending tasks (收据已开但任务未完成的提醒)
  try {
    const receipts = await env.DATABASE.prepare(`
      SELECT 
        r.receipt_id,
        r.receipt_id as receipt_number,
        r.due_date as receipt_due_date,
        r.status as receipt_status,
        c.client_id,
        c.company_name,
        cs.client_service_id,
        s.service_name,
        COUNT(DISTINCT t.task_id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks
      FROM Receipts r
      JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
      JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN ActiveTasks t ON t.client_service_id = cs.client_service_id 
        AND (t.service_month = r.service_start_month OR t.service_month = substr(r.receipt_date, 1, 7))
        AND t.is_deleted = 0
        AND t.assignee_user_id = ?
      WHERE r.is_deleted = 0
        AND r.status IN ('pending', 'partial')
      GROUP BY r.receipt_id
      HAVING completed_tasks < total_tasks AND total_tasks > 0
      ORDER BY r.due_date ASC
      LIMIT 10
    `).bind(String(user.user_id)).all();
    
    res.receiptsPendingTasks = (receipts.results || []).map(r => ({
      receipt_id: r.receipt_id,
      receipt_number: r.receipt_number,
      receipt_due_date: r.receipt_due_date,
      receipt_status: r.receipt_status,
      client_id: r.client_id,
      client_name: r.company_name,
      service_name: r.service_name || '',
      total_tasks: Number(r.total_tasks || 0),
      completed_tasks: Number(r.completed_tasks || 0),
      pending_tasks: Number(r.total_tasks || 0) - Number(r.completed_tasks || 0)
    }));
  } catch (err) {
    console.error('[Dashboard] Employee receipts pending tasks error:', err);
    res.receiptsPendingTasks = [];
  }
  
  return res;
}

