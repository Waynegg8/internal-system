import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    // 根路徑由路由守衛根據登入狀態處理重定向
    beforeEnter: async (to, from, next) => {
      const authStore = useAuthStore()
      // 嘗試從 session 恢復登入狀態
      await authStore.checkSession()
      
      if (authStore.isAuthenticated) {
        // 已登入，重定向到儀表板
        next({ path: '/dashboard' })
      } else {
        // 未登入，重定向到登入頁
        next({ path: '/login' })
      }
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('@/views/clients/ClientsList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/add',
    name: 'ClientAdd',
    component: () => import('@/views/clients/ClientAdd.vue'),
    meta: { requiresAuth: true },
    redirect: '/clients/add/basic',
    children: [
      {
        path: 'basic',
        name: 'ClientAddBasic',
        component: () => import('@/views/clients/add/ClientAddBasic.vue')
      },
      {
        path: 'services',
        name: 'ClientAddServices',
        component: () => import('@/views/clients/add/ClientAddServices.vue')
      },
      {
        path: 'billing',
        name: 'ClientAddBilling',
        component: () => import('@/views/clients/add/ClientAddBilling.vue')
      }
    ]
  },
  {
    path: '/clients/:id',
    name: 'ClientDetail',
    component: () => import('@/views/clients/ClientDetail.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'ClientInfo',
        component: () => import('@/views/clients/ClientBasicInfo.vue')
      },
      {
        path: 'services',
        name: 'ClientServices',
        component: () => import('@/views/clients/ClientServices.vue')
      },
      {
        path: 'billing',
        name: 'ClientBilling',
        component: () => import('@/views/clients/ClientBilling.vue')
      }
    ]
  },
  {
    path: '/clients/:clientId/services/:clientServiceId/config',
    name: 'ClientServiceConfig',
    component: () => import('@/views/clients/ClientServiceConfig.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/tasks/TasksManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/new',
    name: 'TasksNew',
    component: () => import('@/views/tasks/TasksNew.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/overview',
    name: 'TaskOverview',
    redirect: { name: 'Tasks' },
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('@/views/tasks/TaskDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/generation/history',
    name: 'TaskGenerationHistory',
    component: () => import('@/views/tasks/TaskGenerationHistory.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/timesheets',
    name: 'Timesheets',
    component: () => import('@/views/Timesheets.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/receipts',
    name: 'Receipts',
    component: () => import('@/views/receipts/ReceiptsList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/receipts/:id',
    name: 'ReceiptDetail',
    component: () => import('@/views/receipts/ReceiptDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payroll',
    component: () => import('@/views/payroll/PayrollLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Payroll',
        redirect: '/payroll/calc'
      },
      {
        path: 'calc',
        name: 'PayrollCalc',
        component: () => import('@/views/payroll/PayrollCalc.vue')
      },
      {
        path: 'items',
        name: 'PayrollItems',
        component: () => import('@/views/payroll/PayrollItems.vue')
      },
      {
        path: 'emp',
        name: 'PayrollEmp',
        component: () => import('@/views/payroll/PayrollEmp.vue')
      },
      {
        path: 'bonus',
        name: 'PayrollBonus',
        component: () => import('@/views/payroll/PayrollBonus.vue')
      },
      {
        path: 'yearend',
        name: 'PayrollYearend',
        component: () => import('@/views/payroll/PayrollYearend.vue')
      },
      {
        path: 'settings',
        name: 'PayrollSettings',
        component: () => import('@/views/payroll/PayrollSettings.vue')
      },
      {
        path: 'punch',
        name: 'PayrollPunch',
        component: () => import('@/views/payroll/PayrollPunch.vue')
      }
    ]
  },
  {
    path: '/leaves',
    name: 'Leaves',
    component: () => import('@/views/Leaves.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/costs',
    component: () => import('@/views/costs/CostsLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Costs',
        redirect: '/costs/items'
      },
      {
        path: 'items',
        name: 'CostItems',
        component: () => import('@/views/costs/CostItems.vue')
      },
      {
        path: 'records',
        name: 'CostRecords',
        component: () => import('@/views/costs/CostRecordsList.vue')
      },
      {
        path: 'employee',
        redirect: '/costs/client',
        meta: {
          hidden: true
        }
      },
      {
        path: 'client',
        name: 'CostClient',
        component: () => import('@/views/costs/CostClient.vue')
      }
    ]
  },
  {
    path: '/trips',
    name: 'Trips',
    component: () => import('@/views/Trips.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/knowledge',
    component: () => import('@/views/knowledge/KnowledgeLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Knowledge',
        redirect: '/knowledge/sop'
      },
      {
        path: 'sop',
        name: 'KnowledgeSOP',
        component: () => import('@/views/knowledge/KnowledgeSOP.vue')
      },
      {
        path: 'sop/new',
        name: 'SOPNew',
        component: () => import('@/views/knowledge/SOPNew.vue')
      },
      {
        path: 'sop/:id/edit',
        name: 'SOPEdit',
        component: () => import('@/views/knowledge/SOPEdit.vue')
      },
      {
        path: 'faq',
        name: 'KnowledgeFAQ',
        component: () => import('@/views/knowledge/KnowledgeFAQ.vue')
      },
      {
        path: 'faq/new',
        name: 'FAQNew',
        component: () => import('@/views/knowledge/FAQNew.vue')
      },
      {
        path: 'faq/:id/edit',
        name: 'FAQEdit',
        component: () => import('@/views/knowledge/FAQEdit.vue')
      },
      {
        path: 'resources',
        name: 'KnowledgeResources',
        component: () => import('@/views/knowledge/KnowledgeResources.vue')
      },
      {
        path: 'resources/new',
        name: 'ResourceNew',
        component: () => import('@/views/knowledge/ResourceNew.vue')
      },
      {
        path: 'resources/:id/edit',
        name: 'ResourceEdit',
        component: () => import('@/views/knowledge/ResourceEdit.vue')
      },
      {
        path: 'attachments',
        name: 'KnowledgeAttachments',
        component: () => import('@/views/knowledge/KnowledgeAttachments.vue')
      },
      {
        path: 'attachments/new',
        name: 'AttachmentNew',
        component: () => import('@/views/knowledge/AttachmentNew.vue')
      }
    ]
  },
  {
    path: '/settings',
    component: () => import('@/views/settings/SettingsLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Settings',
        redirect: '/settings/services'
      },
      {
        path: 'services',
        name: 'SettingsServices',
        component: () => import('@/views/settings/SettingsServices.vue')
      },
      {
        path: 'templates',
        name: 'SettingsTemplates',
        component: () => import('@/views/settings/SettingsTemplates.vue')
      },
      {
        path: 'users',
        name: 'SettingsUsers',
        component: () => import('@/views/settings/SettingsUsers.vue')
      },
      {
        path: 'company',
        name: 'SettingsCompany',
        component: () => import('@/views/settings/SettingsCompany.vue')
      },
      {
        path: 'automation',
        name: 'SettingsAutomation',
        component: () => import('@/views/settings/SettingsAutomation.vue')
      },
      {
        path: 'holidays',
        name: 'SettingsHolidays',
        component: () => import('@/views/settings/SettingsHolidays.vue')
      }
    ]
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    component: () => import('@/views/Reports.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Reports',
        redirect: '/reports/monthly'
      },
      {
        path: 'monthly',
        name: 'MonthlyReports',
        component: () => import('@/views/reports/MonthlyReports.vue')
      },
      {
        path: 'annual',
        name: 'AnnualReports',
        component: () => import('@/views/reports/AnnualReports.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 頁面標題映射
const titleMap = {
  '/': '首頁',
  '/login': '登入',
  '/dashboard': '儀表板',
  '/clients': '客戶管理',
  '/clients/add': '新增客戶',
  '/tasks': '任務管理',
  '/tasks/new': '新增任務',
  '/tasks/overview': '任務列表',
  '/timesheets': '工時記錄',
  '/leaves': '假期管理',
  '/trips': '外出記錄',
  '/receipts': '收據管理',
  '/payroll': '薪資管理',
  '/costs': '成本管理',
  '/knowledge': '知識庫',
  '/reports': '報表',
  '/settings': '系統設定',
  '/profile': '個人資料'
}

// 路由守衛
router.beforeEach(async (to, from, next) => {
  try {
    const authStore = useAuthStore()
    
    // 設置頁面標題
    const title = titleMap[to.path] || (to.meta.title) || '內部管理系統'
    document.title = `${title} - 內部管理系統`
    
    // 檢查是否需要認證
    if (to.meta.requiresAuth) {
      // 檢查是否已登入
      if (!authStore.isAuthenticated) {
        // 嘗試從 session 恢復登入狀態
        try {
          await authStore.checkSession()
        } catch (error) {
          // 如果檢查 session 失敗，清除狀態並重定向到登入頁
          console.error('檢查 session 失敗:', error)
        }
        
        if (!authStore.isAuthenticated) {
          next({
            path: '/login',
            query: { redirect: to.fullPath }
          })
          return
        }
      }
      
      // 檢查是否需要管理員權限
      if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
        next({ path: '/dashboard' })
        return
      }
    }
    
    // 如果已登入且訪問登入頁，重定向到儀表板
    if (to.path === '/login' && authStore.isAuthenticated) {
      next({ path: '/dashboard' })
      return
    }
    
    next()
  } catch (error) {
    // 如果路由守衛發生未預期的錯誤，記錄並重定向到登入頁
    console.error('路由守衛錯誤:', error)
    next({ path: '/login' })
  }
})


export default router

