<template>
  <div class="skeleton-loader">
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-header"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
        </div>
      </div>
    </div>
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-row header">
        <div v-for="i in columns" :key="i" class="skeleton-cell"></div>
      </div>
      <div v-for="i in count" :key="i" class="skeleton-row">
        <div v-for="j in columns" :key="j" class="skeleton-cell"></div>
      </div>
    </div>
    <div v-else-if="type === 'text'" class="skeleton-text-block">
      <div v-for="i in count" :key="i" class="skeleton-line" :class="{ short: i === count }"></div>
    </div>
    <div v-else-if="type === 'chat'" class="skeleton-chat">
      <div v-for="i in count" :key="i" class="skeleton-message" :class="{ user: i % 2 === 0 }">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-bubble"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'card',
    validator: (value) => ['card', 'list', 'table', 'text', 'chat'].includes(value)
  },
  count: {
    type: Number,
    default: 3
  },
  columns: {
    type: Number,
    default: 4
  }
})
</script>

<style scoped>
.skeleton-loader {
  width: 100%;
}

.skeleton-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.skeleton-header {
  width: 40%;
  height: 20px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-line {
  width: 100%;
  height: 14px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
}

.skeleton-title {
  width: 50%;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-text {
  width: 80%;
  height: 12px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

.skeleton-table {
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.skeleton-row {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-row:last-child {
  border-bottom: none;
}

.skeleton-row.header {
  background: var(--bg-color);
}

.skeleton-row.header .skeleton-cell {
  height: 40px;
}

.skeleton-cell {
  flex: 1;
  height: 48px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  margin: 8px;
  border-radius: 4px;
}

.skeleton-text-block {
  padding: 16px;
}

.skeleton-chat {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.skeleton-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.skeleton-message.user {
  flex-direction: row-reverse;
}

.skeleton-bubble {
  width: 60%;
  height: 60px;
  background: linear-gradient(90deg, var(--bg-color) 25%, var(--hover-color) 50%, var(--bg-color) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 16px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
