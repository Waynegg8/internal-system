<template>
  <div class="task-group-list">
    <!-- 操作工具欄 -->
    <div class="list-toolbar">
      <div class="toolbar-left">
        <a-checkbox
          :indeterminate="isIndeterminate"
          :checked="isAllSelected"
          @change="handleSelectAll"
        >
          全選客戶
        </a-checkbox>
        <a-button
          type="text"
          size="small"
          @click="handleExpandAll"
          class="toolbar-btn"
        >
          {{ isAllExpanded ? '一鍵收合' : '一鍵展開' }}
        </a-button>
      </div>
      <div class="toolbar-right">
        <span class="task-count-text">
          共 {{ totalTaskCount }} 個任務
        </span>
      </div>
    </div>
    
    <a-spin :spinning="loading">
      <a-empty
        v-if="!loading && groupedTasks.length === 0"
        description="沒有符合條件的任務"
        style="padding: 48px"
      />
      
      <div v-else class="task-groups">
        <div
          v-for="clientGroup in groupedTasks"
          :key="`client-${clientGroup.clientId}`"
          class="client-group"
          :class="{ 'client-group-expanded': isClientExpanded(clientGroup.clientId) }"
        >
          <!-- 客戶標題（緊湊型） -->
          <div 
            class="client-header"
            @click="toggleClient(clientGroup.clientId)"
          >
            <div class="client-header-left">
              <a-checkbox
                :checked="isClientSelected(clientGroup.clientId)"
                @click.stop
                @change="(e) => handleClientSelectionChange(clientGroup.clientId, e.target.checked)"
                class="client-checkbox"
              />
              <span class="expand-icon" :class="{ 'expanded': isClientExpanded(clientGroup.clientId) }">
                <RightOutlined />
              </span>
              <strong class="client-name">
                {{ clientGroup.clientName }}
                <span v-if="clientGroup.clientTaxId && clientGroup.clientTaxId !== '—'" class="client-tax-id">
                  ({{ clientGroup.clientTaxId }})
                </span>
              </strong>
              <span class="client-task-count">
                {{ getClientTaskCount(clientGroup) }}個任務
              </span>
            </div>
          </div>
          
          <!-- 服務和任務列表（默認展開或根據狀態） -->
          <div 
            v-if="isClientExpanded(clientGroup.clientId)"
            class="client-content"
          >
            <div v-if="clientGroup.serviceGroups.length === 0" class="no-tasks">
              此客戶目前沒有任務
            </div>
            
            <div
              v-else
              v-for="serviceGroup in clientGroup.serviceGroups"
              :key="`service-${serviceGroup.groupKey}`"
              class="service-group"
            >
              <!-- 服務標題（緊湊型，默認展開顯示任務） -->
              <div class="service-header">
                <div class="service-header-left">
                  <span class="service-name">{{ serviceGroup.serviceTitle }}</span>
                  <span class="service-task-info">
                    ({{ serviceGroup.total }}個任務: {{ serviceGroup.completed }}已完成, {{ serviceGroup.total - serviceGroup.completed }}未完成)
                  </span>
                </div>
                <a-button
                  type="primary"
                  size="small"
                  @click.stop="handleQuickAddTask(serviceGroup)"
                  class="add-task-btn"
                >
                  新增任務
                </a-button>
              </div>
              
              <!-- 任務列表（直接顯示，不再需要點擊展開） -->
              <div class="tasks-list">
                <!-- 按階段分組顯示任務 -->
                <div
                  v-for="stageGroup in getStageGroups(serviceGroup.tasks)"
                  :key="`stage-${stageGroup.stageOrder}`"
                  class="stage-group"
                >
                  <div v-if="stageGroup.stageOrder > 0" class="stage-header">
                    階段 {{ stageGroup.stageOrder }}: {{ stageGroup.stageName || `階段 ${stageGroup.stageOrder}` }}
                  </div>
                  <div class="stage-tasks">
                    <div
                      v-for="task in stageGroup.tasks"
                      :key="getTaskId(task)"
                      class="task-item"
                      :class="getTaskItemClass(task)"
                      @click="handleViewTask(getTaskId(task))"
                    >
                      <a-checkbox
                        :checked="isTaskSelected(getTaskId(task))"
                        @click.stop
                        @change="(e) => handleTaskSelectionChange(getTaskId(task), e.target.checked)"
                        class="task-checkbox"
                      />
                      <div class="task-content">
                        <div class="task-name">{{ getTaskName(task) }}</div>
                        <div class="task-meta">
                          <span class="task-assignee">{{ getAssigneeName(task) || '未分配' }}</span>
                          <span class="task-due">{{ formatDueDate(getDueDate(task)) }}</span>
                          <a-tag :color="getStatusColor(getTaskStatus(task))" size="small">
                            {{ getStatusText(getTaskStatus(task)) }}
                          </a-tag>
                        </div>
                      </div>
                      <a-button 
                        type="link" 
                        size="small" 
                        @click.stop="handleViewTask(getTaskId(task))"
                        class="view-detail-btn"
                      >
                        查看
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
