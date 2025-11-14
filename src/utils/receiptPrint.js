/**
 * 收據列印工具
 */

import { useSettingsApi } from '@/api/settings'

const { getCompanySettings } = useSettingsApi()

/**
 * 載入公司資料
 */
async function loadCompanyInfo(setNumber) {
  try {
    const response = await getCompanySettings(setNumber)
    
    if (response && response.data && Array.isArray(response.data)) {
      const companyInfo = {}
      response.data.forEach(item => {
        // 從 settingKey 提取欄位名稱（移除 company1_ 或 company2_ 前綴）
        const fieldName = item.settingKey.replace(`company${setNumber}_`, '')
        
        // 處理欄位名稱映射
        if (fieldName === 'name') companyInfo.name = item.settingValue
        if (fieldName === 'name_en') companyInfo.nameEn = item.settingValue
        if (fieldName === 'address') companyInfo.address = item.settingValue
        if (fieldName === 'address_line2') companyInfo.addressLine2 = item.settingValue
        if (fieldName === 'phone') companyInfo.phone = item.settingValue
        if (fieldName === 'tax_id') companyInfo.taxId = item.settingValue
        if (fieldName === 'bank') companyInfo.bank = item.settingValue
        if (fieldName === 'bank_code') companyInfo.bankCode = item.settingValue
        if (fieldName === 'account_number') companyInfo.accountNumber = item.settingValue
      })
      return companyInfo
    }
    return null
  } catch (error) {
    console.error('載入公司資料失敗:', error)
    return null
  }
}

/**
 * 顯示公司資料選擇對話框
 */
async function showCompanySelector(callback) {
  // 先載入兩組公司資料的名稱
  const company1Info = await loadCompanyInfo(1)
  const company2Info = await loadCompanyInfo(2)
  
  const company1Name = company1Info && company1Info.name ? company1Info.name : '未設定'
  const company2Name = company2Info && company2Info.name ? company2Info.name : '未設定'
  
  const company1Disabled = !company1Info || !company1Info.name
  const company2Disabled = !company2Info || !company2Info.name
  
  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;'
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;">
      <h3 style="margin:0 0 20px 0;font-size:20px;font-weight:600;">選擇公司資料</h3>
      <p style="color:#666;margin-bottom:24px;font-size:14px;">請選擇要用於此文件的公司資料</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button id="selectCompany1" ${company1Disabled ? 'disabled' : ''} style="flex:1;padding:16px;border:2px solid #3b82f6;background:${company1Disabled ? '#e5e7eb' : '#3b82f6'};color:${company1Disabled ? '#9ca3af' : 'white'};border-radius:8px;font-size:15px;font-weight:600;cursor:${company1Disabled ? 'not-allowed' : 'pointer'};text-align:left;">
          <div style="font-size:13px;font-weight:400;margin-bottom:4px;opacity:0.8;">公司資料 1</div>
          <div style="font-size:16px;">${company1Name}</div>
        </button>
        <button id="selectCompany2" ${company2Disabled ? 'disabled' : ''} style="flex:1;padding:16px;border:2px solid #3b82f6;background:${company2Disabled ? '#e5e7eb' : 'white'};color:${company2Disabled ? '#9ca3af' : '#3b82f6'};border-radius:8px;font-size:15px;font-weight:600;cursor:${company2Disabled ? 'not-allowed' : 'pointer'};text-align:left;">
          <div style="font-size:13px;font-weight:400;margin-bottom:4px;opacity:0.8;">公司資料 2</div>
          <div style="font-size:16px;">${company2Name}</div>
        </button>
      </div>
      ${company1Disabled && company2Disabled ? '<p style="color:#ef4444;margin-top:16px;font-size:13px;text-align:center;">⚠️ 請先至「設定」頁面設定公司資料</p>' : ''}
      <button id="cancelSelect" style="width:100%;margin-top:12px;padding:12px;border:1px solid #d1d5db;background:white;color:#666;border-radius:8px;font-size:14px;cursor:pointer;">取消</button>
    </div>
  `
  document.body.appendChild(modal)
  
  if (!company1Disabled) {
    document.getElementById('selectCompany1').onclick = () => {
      document.body.removeChild(modal)
      callback(1)
    }
  }
  if (!company2Disabled) {
    document.getElementById('selectCompany2').onclick = () => {
      document.body.removeChild(modal)
      callback(2)
    }
  }
  document.getElementById('cancelSelect').onclick = () => {
    document.body.removeChild(modal)
  }
}

/**
 * 列印請款單
 */
export async function printInvoice(receipt) {
  showCompanySelector(async (setNumber) => {
    const companyInfo = await loadCompanyInfo(setNumber)
    if (!companyInfo || !companyInfo.name) {
      // 使用非侵入式通知替代 alert
      const notification = document.createElement('div')
      notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-size:14px;'
      notification.textContent = `公司資料 ${setNumber} 尚未設定，請先至設定頁面設定公司資料`
      document.body.appendChild(notification)
      setTimeout(() => document.body.removeChild(notification), 5000)
      return
    }
    await printInvoiceWithCompany(receipt, companyInfo)
  })
}

/**
 * 列印請款單（帶公司資料）
 */
async function printInvoiceWithCompany(receipt, companyInfo) {
  const printWindow = window.open('', '_blank')
  printWindow.document.write('<html><head><title>列印請款單</title>')
  printWindow.document.write('<meta charset="utf-8">')
  printWindow.document.write('<!-- v20251111 -->')
  printWindow.document.write(`<style>
    @page { size: A4; margin: 20mm 25mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "DFKai-SB", "標楷體", "Microsoft JhengHei", "PingFang TC", serif; 
      font-size: 12pt;
      line-height: 1.8;
      padding: 0;
    }
    .company-header {
      margin-bottom: 10mm;
    }
    .company-name-zh { 
      font-size: 20pt; 
      font-weight: bold; 
      color: #8B6914;
      letter-spacing: 2pt;
      margin-bottom: 6pt;
    }
    .company-name-zh span {
      border-bottom: 2.5px solid #8B6914;
    }
    .company-name-en { 
      font-size: 13pt; 
      font-weight: bold; 
      color: #000;
      font-family: "Times New Roman", serif;
    }
    .company-name-en span {
      border-bottom: 2.5px solid #000;
    }
    .doc-title { 
      font-size: 18pt; 
      font-weight: bold; 
      text-align: center;
      letter-spacing: 8pt;
      border-bottom: 2px solid #000;
      padding-bottom: 3mm;
      margin-bottom: 8mm;
    }
    .customer-name { 
      font-size: 12pt;
      margin-bottom: 8mm;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 8mm 0;
    }
    th, td { 
      border: 1px solid #000; 
      padding: 8pt;
      font-size: 12pt;
    }
    th { 
      text-align: center; 
      font-weight: normal;
    }
    td { 
      text-align: left;
    }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .total-amount { 
      font-size: 13pt;
      font-weight: bold;
      color: #000;
      margin: 8mm 0 3mm 0;
    }
    .withholding { 
      font-size: 12pt;
      margin-bottom: 8mm;
    }
    .bank-section { 
      font-size: 12pt;
      margin-bottom: 8mm;
    }
    .bank-info { 
      font-size: 12pt;
      line-height: 2;
      display: inline-block;
      vertical-align: top;
    }
    .stamp-area {
      display: inline-block;
      width: 80pt;
      height: 80pt;
      margin-left: 30pt;
      vertical-align: top;
    }
    .date-row {
      font-size: 12pt;
      text-align: center;
      letter-spacing: 6pt;
      margin: 15mm 0 10mm 0;
    }
    .page-end {
      text-align: center;
      font-size: 11pt;
      margin-top: 15mm;
      color: #666;
    }
    @media print { 
      button { display: none !important; }
      body { padding: 0; }
    }
  </style>`)
  printWindow.document.write('</head><body>')
  printWindow.document.write('<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;z-index:1000;">列印</button>')
  
  try {
    // 民國紀年轉換
    const convertToROCDateInvoice = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const rocYear = date.getFullYear() - 1911
      const month = date.getMonth() + 1
      const day = date.getDate()
      
      // 轉換為中文數字
      const numberToChinese = (num) => {
        const digits = ['○', '一', '二', '三', '四', '五', '六', '七', '八', '九']
        if (num < 10) return digits[num]
        if (num === 10) return '十'
        if (num < 20) return '十' + digits[num - 10]
        const tens = Math.floor(num / 10)
        const ones = num % 10
        if (tens === 0) return digits[ones]
        if (ones === 0) return digits[tens] + '十'
        return digits[tens] + '十' + digits[ones]
      }
      
      // 轉換年份為單獨數字（如114年 -> 一一四年）
      const convertYear = (year) => {
        const digits = ['○', '一', '二', '三', '四', '五', '六', '七', '八', '九']
        const yearStr = String(year)
        let result = ''
        for (let i = 0; i < yearStr.length; i++) {
          result += digits[parseInt(yearStr[i])]
        }
        return result
      }
      
      return `中　華　民　國　${convertYear(rocYear)}　年　${numberToChinese(month)}　月　${numberToChinese(day)}　日`
    }
    
    let totalServiceFee = 0
    let totalGovFee = 0
    let totalMiscFee = 0
    
    // 處理收據資料（兼容不同的欄位名稱）
    const receiptId = receipt.receiptId || receipt.receipt_id
    const clientName = receipt.clientName || receipt.client_name
    const receiptDate = receipt.receiptDate || receipt.receipt_date
    const totalAmount = receipt.totalAmount || receipt.total_amount || 0
    const withholdingAmount = receipt.withholdingAmount || receipt.withholding_amount || 0
    const items = receipt.items || receipt.receipt_items || []
    
    printWindow.document.write(`
      <div class="company-header">
        <div class="company-name-zh"><span>${companyInfo.name}</span></div>
        <div class="company-name-en"><span>${companyInfo.nameEn || ''}</span></div>
      </div>
      
      <div class="doc-title">請款單</div>
      
      <div class="customer-name"><strong>客戶名稱：</strong>${clientName}</div>
      
      <table>
        <thead>
          <tr>
            <th style="width:40%">項目</th>
            <th style="width:20%">代辦費<br>（新台幣）</th>
            <th style="width:20%">規費<br>（新台幣）</th>
            <th style="width:20%">雜費<br>（新台幣）</th>
          </tr>
        </thead>
        <tbody>
    `)
    
    // 添加明細
    if (items.length > 0) {
      items.forEach(item => {
        const serviceName = item.serviceName || item.service_name || ''
        const serviceFee = item.serviceFee || item.service_fee || 0
        const govFee = item.governmentFee || item.government_fee || 0
        const miscFee = item.miscellaneousFee || item.miscellaneous_fee || 0
        const notes = item.notes || ''
        
        totalServiceFee += serviceFee
        totalGovFee += govFee
        totalMiscFee += miscFee
        
        printWindow.document.write(`
          <tr>
            <td>${serviceName}${notes ? '，' + notes : ''}</td>
            <td class="text-right">${serviceFee > 0 ? '$' + serviceFee.toLocaleString() : '$-'}</td>
            <td class="text-right">${govFee > 0 ? '$' + govFee.toLocaleString() : '$-'}</td>
            <td class="text-right">${miscFee > 0 ? '$' + miscFee.toLocaleString() : '$-'}</td>
          </tr>
        `)
      })
    } else {
      totalServiceFee = totalAmount
      printWindow.document.write(`
        <tr>
          <td>${receipt.notes || '服務費用'}</td>
          <td class="text-right">$${totalAmount.toLocaleString()}</td>
          <td class="text-right">$-</td>
          <td class="text-right">$-</td>
        </tr>
      `)
    }
    
    // 合計行
    printWindow.document.write(`
          <tr>
            <td class="text-center">合計</td>
            <td class="text-right">$${totalServiceFee.toLocaleString()}</td>
            <td class="text-right">$${totalGovFee > 0 ? totalGovFee.toLocaleString() : '-'}</td>
            <td class="text-right">$${totalMiscFee > 0 ? totalMiscFee.toLocaleString() : '-'}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="total-amount">費用總計：${totalAmount.toLocaleString()} 元</div>
      
      <div class="withholding">（本次扣繳金額：${withholdingAmount || 0} 元）</div>
      
      <div class="bank-section">款項請匯入下列帳戶，謝謝！</div>
      
      <div class="bank-info">
        戶名：${companyInfo.name}<br>
        銀行：${companyInfo.bank}<br>
        銀行代號：${companyInfo.bankCode}<br>
        帳號：${companyInfo.accountNumber}
      </div>
      <div class="stamp-area">
        <!-- 印章區域 -->
      </div>
      
      <div class="date-row">${convertToROCDateInvoice(receiptDate)}</div>
      
      <div class="page-end">——————————————本頁完——————————————</div>
    `)
    
    printWindow.document.write('</body></html>')
    printWindow.document.close()
  } catch (error) {
    console.error('列印請款單失敗:', error)
    // 使用非侵入式通知替代 alert
    const notification = document.createElement('div')
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-size:14px;'
    notification.textContent = '列印請款單失敗，請稍後再試'
    document.body.appendChild(notification)
    setTimeout(() => document.body.removeChild(notification), 5000)
  }
}

/**
 * 列印收據
 */
export async function printReceipt(receipt) {
  showCompanySelector(async (setNumber) => {
    const companyInfo = await loadCompanyInfo(setNumber)
    if (!companyInfo || !companyInfo.name) {
      // 使用非侵入式通知替代 alert
      const notification = document.createElement('div')
      notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-size:14px;'
      notification.textContent = `公司資料 ${setNumber} 尚未設定，請先至設定頁面設定公司資料`
      document.body.appendChild(notification)
      setTimeout(() => document.body.removeChild(notification), 5000)
      return
    }
    await printReceiptWithCompany(receipt, companyInfo)
  })
}

/**
 * 列印收據（帶公司資料）
 */
async function printReceiptWithCompany(receipt, companyInfo) {
  const printWindow = window.open('', '_blank')
  printWindow.document.write('<html><head><title>列印收據</title>')
  printWindow.document.write('<meta charset="utf-8">')
  printWindow.document.write('<!-- v20251111 -->')
  printWindow.document.write(`<style>
    @page { size: A4; margin: 12mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "DFKai-SB", "標楷體", "BiauKai", serif; 
      font-size: 10pt;
      padding: 0;
    }
    .receipt-page { page-break-after: auto; }
    .receipt-copy { 
      position: relative;
      border: 2px solid #000; 
      padding: 8mm 10mm 8mm 10mm;
      padding-right: 15mm;
      margin-bottom: 8mm;
      min-height: auto;
    }
    .receipt-copy:last-child { margin-bottom: 0; page-break-after: avoid; }
    .copy-label { 
      position: absolute; 
      right: 3mm; 
      top: 50%; 
      transform: translateY(-50%); 
      writing-mode: vertical-rl;
      font-size: 16pt; 
      font-weight: bold;
      letter-spacing: 8pt;
    }
    .company-name { 
      font-size: 20pt; 
      font-weight: bold; 
      text-align: center; 
      margin-bottom: 1mm;
    }
    .company-name span {
      border-bottom: 2px solid #000;
    }
    .company-info { 
      font-size: 9pt; 
      text-align: right; 
      margin-bottom: 2mm;
      margin-top: 1mm;
      line-height: 1.3;
    }
    .title { 
      font-size: 20pt; 
      font-weight: bold; 
      text-align: center; 
      margin: 2mm 0 2mm 0;
    }
    .title span {
      border-bottom: 2px solid #000;
      display: inline-block;
    }
    .date { text-align: center; font-size: 10pt; margin-bottom: 3mm; }
    .received-from { font-size: 11pt; margin: 3mm 0; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0; border: 2px solid #000; }
    th, td { border: 1.5px solid #000; padding: 4pt 6pt; }
    th { text-align: center; font-weight: normal; font-size: 10pt; }
    td { font-size: 10pt; }
    .amount-chinese { font-weight: bold; padding: 6pt; font-size: 11pt; }
    .signature { 
      display: flex; 
      justify-content: space-around; 
      margin: 4mm 0 3mm 0; 
      font-size: 11pt; 
    }
    @media print { 
      button { display: none !important; }
      body { padding: 0; }
    }
  </style>`)
  printWindow.document.write('</head><body>')
  printWindow.document.write('<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;z-index:1000;">列印</button>')
  
  try {
    // 處理收據資料
    const receiptId = receipt.receiptId || receipt.receipt_id
    const clientName = receipt.clientName || receipt.client_name
    const receiptDate = receipt.receiptDate || receipt.receipt_date
    const totalAmount = receipt.totalAmount || receipt.total_amount || 0
    const items = receipt.items || receipt.receipt_items || []
    
    // 民國紀年轉換
    const convertToROCDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const rocYear = date.getFullYear() - 1911
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `中華民國${rocYear}年${month}月${day}日`
    }
    
    // 數字轉中文大寫
    const convertAmountToChinese = (amount) => {
      const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
      const units = ['', '拾', '佰', '仟']
      
      if (amount === 0) return '零'
      
      const amountInt = Math.floor(amount)
      
      // 轉換一個4位數段
      const convertSection = (num) => {
        if (num === 0) return ''
        const str = num.toString().padStart(4, '0')
        let result = ''
        let hasNonZero = false
        
        for (let i = 0; i < 4; i++) {
          const digit = parseInt(str[i])
          const unitIndex = 3 - i
          
          if (digit === 0) {
            if (hasNonZero && i < 3) {
              // 只在有非零數字之後且不是最後一位時可能加零
              const hasNextNonZero = str.slice(i + 1).split('').some(d => d !== '0')
              if (hasNextNonZero) {
                result += '零'
                hasNonZero = false
              }
            }
          } else {
            result += digits[digit] + units[unitIndex]
            hasNonZero = true
          }
        }
        
        return result
      }
      
      // 分段：億、萬、個
      const yi = Math.floor(amountInt / 100000000)
      const wan = Math.floor((amountInt % 100000000) / 10000)
      const ge = amountInt % 10000
      
      let result = ''
      
      if (yi > 0) {
        result += convertSection(yi) + '億'
      }
      
      if (wan > 0) {
        if (result && wan < 1000) {
          result += '零'
        }
        result += convertSection(wan) + '萬'
      } else if (yi > 0 && ge > 0) {
        result += '零'
      }
      
      if (ge > 0) {
        if (result && ge < 1000) {
          result += '零'
        }
        result += convertSection(ge)
      }
      
      return result || '零'
    }
    
    const rocDate = convertToROCDate(receiptDate)
    const amountChinese = convertAmountToChinese(totalAmount)
    
    // 生成兩聯收據（收執聯和存查聯）在同一頁
    printWindow.document.write('<div class="receipt-page">')
    
    const copies = ['收執聯', '存查聯']
    
    copies.forEach((copyLabel) => {
      printWindow.document.write(`
        <div class="receipt-copy">
          <div class="copy-label">${copyLabel}</div>
          
          <div class="company-name"><span>${companyInfo.name}</span></div>
          
          <div class="company-info">
            ${companyInfo.address}${companyInfo.addressLine2 || ''}<br>
            電話：${companyInfo.phone}<br>
            統一編號：${companyInfo.taxId}<br>
            收據編號：${receiptId}
          </div>
          
          <div class="title"><span>收　　　　　　　　據</span></div>
          
          <div class="date">${rocDate}</div>
          
          <div class="received-from">
            茲收到　<strong>${clientName}</strong>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width:50%">項　　目</th>
                <th style="width:20%">金　　額</th>
                <th style="width:15%">支票號碼</th>
                <th style="width:15%">備　　註</th>
              </tr>
            </thead>
            <tbody>
      `)
      
      // 添加明細或總金額
      if (items.length > 0) {
        items.forEach(item => {
          const serviceName = item.serviceName || item.service_name || ''
          const serviceFee = item.serviceFee || item.service_fee || 0
          const govFee = item.governmentFee || item.government_fee || 0
          const miscFee = item.miscellaneousFee || item.miscellaneous_fee || 0
          const subtotal = item.subtotal || (serviceFee + govFee + miscFee)
          const notes = item.notes || ''
          
          printWindow.document.write(`
            <tr>
              <td>${serviceName}</td>
              <td style="text-align:right">${subtotal.toLocaleString()}</td>
              <td style="text-align:center"></td>
              <td>${notes}</td>
            </tr>
          `)
        })
      } else {
        printWindow.document.write(`
          <tr>
            <td>${receipt.notes || '服務費用'}</td>
            <td style="text-align:right">${totalAmount.toLocaleString()}</td>
            <td style="text-align:center"></td>
            <td></td>
          </tr>
        `)
      }
      
      // 添加空白行（至少3行）
      const itemCount = items.length || 1
      const emptyRows = Math.max(3 - itemCount, 0)
      for (let i = 0; i < emptyRows; i++) {
        printWindow.document.write('<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>')
      }
      
      // 合計行
      printWindow.document.write(`
              <tr>
                <td colspan="4" class="amount-chinese">
                  合計金額(大寫)新台幣：${amountChinese}元整
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="signature">
            <div>會計師：　　　　　　　　　　　</div>
            <div>經收人：　　　　　　　　　　　</div>
          </div>
        </div>
      `)
    })
    
    printWindow.document.write('</div>') // 關閉 receipt-page
    printWindow.document.write('</body></html>')
    printWindow.document.close()
  } catch (error) {
    console.error('列印收據失敗:', error)
    // 使用非侵入式通知替代 alert
    const notification = document.createElement('div')
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-size:14px;'
    notification.textContent = '列印收據失敗，請稍後再試'
    document.body.appendChild(notification)
    setTimeout(() => document.body.removeChild(notification), 5000)
  }
}

