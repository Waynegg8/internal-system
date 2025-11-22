<template>
  <div class="pdf-viewer">
    <a-spin :spinning="isBusy" tip="載入 PDF 中...">
      <div v-if="errorMessage" class="pdf-viewer-error">
        <a-alert type="error" :message="errorMessage" show-icon />
        <a-button type="primary" size="small" @click="handleRetry" style="margin-top: 12px">
          重新載入
        </a-button>
      </div>

      <div v-else-if="!pdfReady" class="pdf-viewer-empty">
        <a-empty description="尚未有可預覽的 PDF" />
      </div>

      <div v-else class="pdf-viewer-content">
        <div class="pdf-viewer-toolbar">
          <a-space size="small" align="center">
            <a-tooltip title="上一頁">
              <a-button
                type="text"
                size="small"
                :icon="h(LeftOutlined)"
                :disabled="currentPage <= 1 || isBusy"
                @click="goToPrevious"
              />
            </a-tooltip>
            <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
            <a-tooltip title="下一頁">
              <a-button
                type="text"
                size="small"
                :icon="h(RightOutlined)"
                :disabled="currentPage >= totalPages || isBusy"
                @click="goToNext"
              />
            </a-tooltip>

            <span class="toolbar-divider" />

            <a-tooltip title="縮小">
              <a-button
                type="text"
                size="small"
                :icon="h(ZoomOutOutlined)"
                :disabled="!canZoomOut || isBusy"
                @click="zoomOut"
              />
            </a-tooltip>
            <span class="zoom-indicator">{{ displayScale }}%</span>
            <a-tooltip title="放大">
              <a-button
                type="text"
                size="small"
                :icon="h(ZoomInOutlined)"
                :disabled="!canZoomIn || isBusy"
                @click="zoomIn"
              />
            </a-tooltip>

            <a-tooltip :title="fitToWidth ? '已符合寬度' : '適應寬度'">
              <a-button
                type="text"
                size="small"
                :icon="h(ColumnWidthOutlined)"
                :type="fitToWidth ? 'primary' : 'text'"
                :disabled="isBusy || fitToWidth"
                @click="enableFitToWidth"
              />
            </a-tooltip>

            <a-tooltip title="重新整理">
              <a-button
                type="text"
                size="small"
                :icon="h(ReloadOutlined)"
                :disabled="isBusy"
                @click="rerenderCurrentPage"
              />
            </a-tooltip>

            <span v-if="fileName" class="file-name" :title="fileName">
              {{ fileName }}
            </span>
          </a-space>
        </div>

        <div class="pdf-viewer-canvas" ref="canvasContainer">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, h, shallowRef, markRaw, nextTick } from 'vue'
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined, ColumnWidthOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({
  data: {
    type: [Uint8Array, ArrayBuffer, Object],
    default: null
  },
  fileName: {
    type: String,
    default: ''
  }
})

const canvasContainer = ref(null)
const canvasRef = ref(null)
const pdfDocument = shallowRef(null)
const totalPages = ref(0)
const currentPage = ref(1)
const autoScale = ref(1)
const manualScale = ref(1)
const fitToWidth = ref(true)
const loadingDocument = ref(false)
const renderingPage = ref(false)
const errorMessage = ref('')
const lastLoadedData = ref(null)

const loadingTaskRef = shallowRef(null)
const renderTaskRef = shallowRef(null)
let resizeObserver = null

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.15

const isBusy = computed(() => loadingDocument.value || renderingPage.value)
const pdfReady = computed(() => !!pdfDocument.value && totalPages.value > 0)
const displayScale = computed(() => Math.round((fitToWidth.value ? autoScale.value : manualScale.value) * 100))
const canZoomIn = computed(() => !fitToWidth.value && manualScale.value < MAX_SCALE)
const canZoomOut = computed(() => !fitToWidth.value && manualScale.value > MIN_SCALE)

const normaliseData = (data) => {
  if (!data) return null
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer)
  }
  return null
}

const cancelRenderTask = async () => {
  if (renderTaskRef.value) {
    const task = renderTaskRef.value
    renderTaskRef.value = null // 立即清空引用，避免重複取消
    
    try {
      // 先取消渲染任務
      if (task && typeof task.cancel === 'function') {
        task.cancel()
      }
      
      // 等待 Promise 完全完成或被取消（忽略所有錯誤）
      if (task && task.promise) {
        try {
          await Promise.race([
            task.promise,
            // 添加超時保護，防止永遠等待
            new Promise(resolve => setTimeout(resolve, 1000))
          ])
        } catch (err) {
          // 完全忽略所有錯誤，包括 RenderingCancelledException
          // 這只是確保 Promise 完成
        }
      }
    } catch (err) {
      // 完全忽略所有錯誤，確保不會中斷流程
    }
    
    // 額外等待，確保瀏覽器完全清理渲染操作
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  // 確保等待一個 tick，讓瀏覽器完全清理渲染操作
  await nextTick()
}

const resetViewerState = async () => {
  await cancelRenderTask()
  
  // 清空 canvas
  if (canvasRef.value) {
    const canvas = canvasRef.value
    const context = canvas.getContext('2d', { alpha: false })
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
    }
  }
  
  if (loadingTaskRef.value && typeof loadingTaskRef.value.destroy === 'function') {
    try {
      await loadingTaskRef.value.destroy()
    } catch (err) {
      console.warn('釋放 PDF 載入任務失敗:', err)
    }
  }
  loadingTaskRef.value = null

  if (pdfDocument.value && typeof pdfDocument.value.destroy === 'function') {
    try {
      await pdfDocument.value.destroy()
    } catch (err) {
      console.warn('釋放 PDF 文件失敗:', err)
    }
  }
  pdfDocument.value = null
  totalPages.value = 0
  currentPage.value = 1
  autoScale.value = 1
  manualScale.value = 1
  lastLoadedData.value = null
}

const determineScale = (viewport) => {
  if (!canvasContainer.value) {
    return fitToWidth.value ? 1 : manualScale.value
  }
  if (!fitToWidth.value) {
    return manualScale.value
  }
  const containerWidth = canvasContainer.value.clientWidth
  if (!containerWidth || containerWidth <= 0) {
    return autoScale.value || 1
  }
  const newScale = containerWidth / viewport.width
  autoScale.value = newScale
  return newScale
}

const renderCurrentPage = async () => {
  if (!pdfDocument.value) return

  if (!canvasRef.value) {
    await nextTick()
  }

  if (!canvasRef.value) return

  // 先取消並等待前一個渲染任務完全完成清理
  await cancelRenderTask()
  
  // 再次確認沒有殘留的渲染任務
  if (renderTaskRef.value) {
    console.warn('[PdfViewer] 警告：仍有殘留的渲染任務，強制清除')
    renderTaskRef.value = null
    await nextTick()
  }
  
  // 清空 canvas，確保沒有殘留的渲染操作
  const canvas = canvasRef.value
  if (!canvas) {
    console.error('[PdfViewer] Canvas 不存在')
    return
  }
  
  // 清空內容並重置尺寸，強制清理渲染上下文
  const oldContext = canvas.getContext('2d', { alpha: false })
  if (oldContext) {
    // 保存舊尺寸
    const oldWidth = canvas.width
    const oldHeight = canvas.height
    
    // 清空現有內容
    oldContext.clearRect(0, 0, oldWidth || 1, oldHeight || 1)
    // 重置變換矩陣
    oldContext.setTransform(1, 0, 0, 1, 0, 0)
  }
  
  // 重置 canvas 尺寸為 0，強制清理所有渲染狀態
  canvas.width = 0
  canvas.height = 0
  canvas.style.width = '0px'
  canvas.style.height = '0px'
  
  // 等待額外的時間，確保瀏覽器完全清理
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // 再次檢查 canvas 是否存在
  if (!canvasRef.value || !pdfDocument.value) {
    return
  }
  
  renderingPage.value = true
  errorMessage.value = ''

  try {
    const page = await pdfDocument.value.getPage(currentPage.value)
    const viewport = page.getViewport({ scale: 1 })
    const scale = determineScale(viewport)
    const scaledViewport = page.getViewport({ scale })
    
    if (!canvasRef.value) {
      return
    }
    
    const devicePixelRatio = window.devicePixelRatio || 1

    // 設置新的 canvas 尺寸（這會創建一個全新的渲染上下文）
    canvas.width = Math.floor(scaledViewport.width * devicePixelRatio)
    canvas.height = Math.floor(scaledViewport.height * devicePixelRatio)
    canvas.style.width = `${scaledViewport.width}px`
    canvas.style.height = `${scaledViewport.height}px`

    // 獲取新的 context（重置尺寸後會自動創建新的 context）
    const context = canvas.getContext('2d', { alpha: false })
    
    // 設置變換矩陣
    if (devicePixelRatio !== 1) {
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    } else {
      context.setTransform(1, 0, 0, 1, 0, 0)
    }

    // 填充白色背景
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, scaledViewport.width, scaledViewport.height)

    // 創建渲染上下文
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport
    }

    // 再次確認沒有殘留的渲染任務
    if (renderTaskRef.value) {
      console.warn('[PdfViewer] 警告：在開始新渲染前仍有殘留任務，強制清除')
      renderTaskRef.value = null
      await nextTick()
    }

    // 開始渲染
    const renderTask = page.render(renderContext)
    renderTaskRef.value = markRaw(renderTask)
    await renderTask.promise
  } catch (error) {
    // 忽略取消錯誤和 canvas 重複使用錯誤
    const isCancellationError = 
      error?.name === 'RenderingCancelledException' || 
      error?.message === 'Rendering cancelled' ||
      error?.message?.includes('Cannot use the same canvas during multiple render() operations')
    
    if (!isCancellationError) {
      console.error('[PdfViewer] 渲染 PDF 頁面失敗:', error)
      errorMessage.value = error.message || '渲染 PDF 頁面失敗'
    } else {
      // 如果是取消錯誤，清空錯誤訊息（這是正常情況）
      errorMessage.value = ''
    }
  } finally {
    renderingPage.value = false
  }
}

const loadPdf = async () => {
  const normalised = normaliseData(props.data)
  if (!normalised) {
    await resetViewerState()
    return
  }

  if (lastLoadedData.value === normalised) {
    return
  }

  await resetViewerState()

  loadingDocument.value = true
  errorMessage.value = ''

  try {
    lastLoadedData.value = normalised
    loadingTaskRef.value = markRaw(pdfjsLib.getDocument({ data: normalised }))
    const pdf = await loadingTaskRef.value.promise
    pdfDocument.value = markRaw(pdf)
    totalPages.value = pdf.numPages || 0
    currentPage.value = 1
    await renderCurrentPage()
  } catch (error) {
    console.error('載入 PDF 失敗:', error)
    errorMessage.value = error.message || '載入 PDF 失敗'
    await resetViewerState()
  } finally {
    loadingDocument.value = false
  }
}

const goToPrevious = async () => {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  await renderCurrentPage()
}

const goToNext = async () => {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  await renderCurrentPage()
}

const zoomIn = async () => {
  fitToWidth.value = false
  manualScale.value = Math.min(manualScale.value + SCALE_STEP, MAX_SCALE)
  await renderCurrentPage()
}

const zoomOut = async () => {
  fitToWidth.value = false
  manualScale.value = Math.max(manualScale.value - SCALE_STEP, MIN_SCALE)
  await renderCurrentPage()
}

const enableFitToWidth = async () => {
  fitToWidth.value = true
  await renderCurrentPage()
}

const rerenderCurrentPage = async () => {
  await renderCurrentPage()
}

const handleRetry = async () => {
  await loadPdf()
}

watch(
  () => props.data,
  async () => {
    await loadPdf()
  },
  { immediate: true, flush: 'post' }
)

watch(
  fitToWidth,
  async () => {
    await renderCurrentPage()
  },
  { flush: 'post' }
)

watch(
  manualScale,
  async (newVal, oldVal) => {
    if (fitToWidth.value) return
    if (Math.abs(newVal - oldVal) < 0.001) return
    await renderCurrentPage()
  },
  { flush: 'post' }
)

watch(
  currentPage,
  async (newVal, oldVal) => {
    if (newVal === oldVal) return
    await renderCurrentPage()
  },
  { flush: 'post' }
)

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (fitToWidth.value && pdfReady.value) {
        renderCurrentPage()
      }
    })
    if (canvasContainer.value) {
      resizeObserver.observe(canvasContainer.value)
    }
  }
})

onBeforeUnmount(async () => {
  if (resizeObserver && canvasContainer.value) {
    resizeObserver.unobserve(canvasContainer.value)
  }
  await resetViewerState()
})
</script>

<style scoped>
.pdf-viewer {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pdf-viewer :deep(.ant-spin-nested-loading) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.pdf-viewer :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.pdf-viewer-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
}

.pdf-viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 8px;
  background: #f7f8fa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.pdf-viewer-toolbar .ant-space {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: #d9d9d9;
  margin: 0 4px;
}

.page-indicator,
.zoom-indicator {
  font-size: 13px;
  color: #4a4a4a;
}

.zoom-indicator {
  min-width: 48px;
  text-align: center;
}

.file-name {
  font-size: 12px;
  color: #666;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdf-viewer-canvas {
  position: relative;
  flex: 1;
  overflow: auto;
  background: #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pdf-viewer-canvas canvas {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  border-radius: 4px;
}

.pdf-viewer-empty,
.pdf-viewer-error {
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}
</style>

