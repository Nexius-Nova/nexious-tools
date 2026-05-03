<template>
  <div
    class="quick-launch-mode"
    ref="quickLaunchRef"
    :class="{ 'dark-mode': isDarkMode }"
  >
    <div class="search-box" :class="{ 'dark-mode': isDarkMode }">
      <div class="search-logo">
        <svg
          width="24"
          height="24"
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="64" cy="64" r="64" fill="#2F3242" />
          <path
            d="M51.3954 39.5028C52.3733 39.6812 53.3108 39.033 53.4892 38.055C53.6676 37.0771 53.0194 36.1396 52.0414 35.9612L51.3954 39.5028ZM28.6153 43.5751L30.1748 44.4741L30.1748 44.4741L28.6153 43.5751ZM28.9393 60.9358C29.4332 61.7985 30.5329 62.0976 31.3957 61.6037C32.2585 61.1098 32.5575 60.0101 32.0636 59.1473L28.9393 60.9358ZM37.6935 66.7457C37.025 66.01 35.8866 65.9554 35.1508 66.6239C34.415 67.2924 34.3605 68.4308 35.029 69.1666L37.6935 66.7457ZM53.7489 81.7014L52.8478 83.2597L53.7489 81.7014ZM96.9206 89.515C97.7416 88.9544 97.9526 87.8344 97.3919 87.0135C96.8313 86.1925 95.7113 85.9815 94.8904 86.5422L96.9206 89.515ZM52.0414 35.9612C46.4712 34.9451 41.2848 34.8966 36.9738 35.9376C32.6548 36.9806 29.0841 39.1576 27.0559 42.6762L30.1748 44.4741C31.5693 42.0549 34.1448 40.3243 37.8188 39.4371C41.5009 38.5479 46.1547 38.5468 51.3954 39.5028L52.0414 35.9612ZM27.0559 42.6762C24.043 47.9029 25.2781 54.5399 28.9393 60.9358L32.0636 59.1473C28.6579 53.1977 28.1088 48.0581 30.1748 44.4741L27.0559 42.6762ZM35.029 69.1666C39.6385 74.24 45.7158 79.1355 52.8478 83.2597L54.6499 80.1432C47.8081 76.1868 42.0298 71.5185 37.6935 66.7457L35.029 69.1666ZM52.8478 83.2597C61.344 88.1726 70.0465 91.2445 77.7351 92.3608C85.359 93.4677 92.2744 92.6881 96.9206 89.515L94.8904 86.5422C91.3255 88.9767 85.4902 89.849 78.2524 88.7982C71.0793 87.7567 62.809 84.8612 54.6499 80.1432L52.8478 83.2597ZM105.359 84.9077C105.359 81.4337 102.546 78.6127 99.071 78.6127V82.2127C100.553 82.2127 101.759 83.4166 101.759 84.9077H105.359ZM99.071 78.6127C95.5956 78.6127 92.7831 81.4337 92.7831 84.9077H96.3831C96.3831 83.4166 97.5892 82.2127 99.071 82.2127V78.6127ZM92.7831 84.9077C92.7831 88.3817 95.5956 91.2027 99.071 91.2027V87.6027C97.5892 87.6027 96.3831 86.3988 96.3831 84.9077H92.7831ZM99.071 91.2027C102.546 91.2027 105.359 88.3817 105.359 84.9077H101.759C101.759 86.3988 100.553 87.6027 99.071 87.6027V91.2027Z"
            fill="#A2ECFB"
          />
          <path
            d="M91.4873 65.382C90.8456 66.1412 90.9409 67.2769 91.7002 67.9186C92.4594 68.5603 93.5951 68.465 94.2368 67.7058L91.4873 65.382ZM99.3169 43.6354L97.7574 44.5344L99.3169 43.6354ZM84.507 35.2412C83.513 35.2282 82.6967 36.0236 82.6838 37.0176C82.6708 38.0116 83.4661 38.8279 84.4602 38.8409L84.507 35.2412ZM74.9407 39.8801C75.9127 39.6716 76.5315 38.7145 76.323 37.7425C76.1144 36.7706 75.1573 36.1517 74.1854 36.3603L74.9407 39.8801ZM53.7836 46.3728L54.6847 47.931L53.7836 46.3728ZM25.5491 80.9047C25.6932 81.8883 26.6074 82.5688 27.5911 82.4247C28.5747 82.2806 29.2552 81.3664 29.1111 80.3828L25.5491 80.9047ZM94.2368 67.7058C97.8838 63.3907 100.505 58.927 101.752 54.678C103.001 50.4213 102.9 46.2472 100.876 42.7365L97.7574 44.5344C99.1494 46.9491 99.3603 50.0419 98.2974 53.6644C97.2323 57.2945 94.9184 61.3223 91.4873 65.382L94.2368 67.7058ZM100.876 42.7365C97.9119 37.5938 91.7082 35.335 84.507 35.2412L84.4602 38.8409C91.1328 38.9278 95.7262 41.0106 97.7574 44.5344L100.876 42.7365ZM74.1854 36.3603C67.4362 37.8086 60.0878 40.648 52.8826 44.8146L54.6847 47.931C61.5972 43.9338 68.5948 41.2419 74.9407 39.8801L74.1854 36.3603ZM52.8826 44.8146C44.1366 49.872 36.9669 56.0954 32.1491 62.3927C27.3774 68.63 24.7148 75.2115 25.5491 80.9047L29.1111 80.3828C28.4839 76.1026 30.4747 70.5062 35.0084 64.5802C39.496 58.7143 46.2839 52.7889 54.6847 47.931L52.8826 44.8146Z"
            fill="#A2ECFB"
          />
          <path
            d="M49.0825 87.2295C48.7478 86.2934 47.7176 85.8059 46.7816 86.1406C45.8455 86.4753 45.358 87.5055 45.6927 88.4416L49.0825 87.2295ZM78.5635 96.4256C79.075 95.5732 78.7988 94.4675 77.9464 93.9559C77.0941 93.4443 75.9884 93.7205 75.4768 94.5729L78.5635 96.4256ZM79.5703 85.1795C79.2738 86.1284 79.8027 87.1379 80.7516 87.4344C81.7004 87.7308 82.71 87.2019 83.0064 86.2531L79.5703 85.1795ZM84.3832 64.0673H82.5832H84.3832ZM69.156 22.5301C68.2477 22.1261 67.1838 22.535 66.7799 23.4433C66.3759 24.3517 66.7848 25.4155 67.6931 25.8194L69.156 22.5301ZM45.6927 88.4416C47.5994 93.7741 50.1496 98.2905 53.2032 101.505C56.2623 104.724 59.9279 106.731 63.9835 106.731V103.131C61.1984 103.131 58.4165 101.765 55.8131 99.0249C53.2042 96.279 50.8768 92.2477 49.0825 87.2295L45.6927 88.4416ZM63.9835 106.731C69.8694 106.731 74.8921 102.542 78.5635 96.4256L75.4768 94.5729C72.0781 100.235 68.0122 103.131 63.9835 103.131V106.731ZM83.0064 86.2531C85.0269 79.7864 86.1832 72.1831 86.1832 64.0673H82.5832C82.5832 71.8536 81.4723 79.0919 79.5703 85.1795L83.0064 86.2531ZM86.1832 64.0673C86.1832 54.1144 84.4439 44.922 81.4961 37.6502C78.5748 30.4436 74.3436 24.8371 69.156 22.5301L67.6931 25.8194C71.6364 27.5731 75.3846 32.1564 78.1598 39.0026C80.9086 45.7836 82.5832 54.507 82.5832 64.0673H86.1832Z"
            fill="#A2ECFB"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M103.559 84.9077C103.559 82.4252 101.55 80.4127 99.071 80.4127C96.5924 80.4127 94.5831 82.4252 94.5831 84.9077C94.5831 87.3902 96.5924 89.4027 99.071 89.4027C101.55 89.4027 103.559 87.3902 103.559 84.9077V84.9077Z"
            stroke="#A2ECFB"
            stroke-width="3.6"
            stroke-linecap="round"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M28.8143 89.4027C31.2929 89.4027 33.3023 87.3902 33.3023 84.9077C33.3023 82.4252 31.2929 80.4127 28.8143 80.4127C26.3357 80.4127 24.3264 82.4252 24.3264 84.9077C24.3264 87.3902 26.3357 89.4027 28.8143 89.4027V89.4027V89.4027Z"
            stroke="#A2ECFB"
            stroke-width="3.6"
            stroke-linecap="round"
          />
          <ellipse
            cx="63.9835"
            cy="23.2036"
            rx="4.48794"
            ry="4.495"
            stroke="#A2ECFB"
            stroke-width="3.6"
            stroke-linecap="round"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M64.8501 68.0857C62.6341 68.5652 60.451 67.1547 59.9713 64.9353C59.4934 62.7159 60.9007 60.5293 63.1167 60.0489C65.3326 59.5693 67.5157 60.9798 67.9954 63.1992C68.4742 65.4186 67.066 67.6052 64.8501 68.0857Z"
            fill="#A2ECFB"
          />
        </svg>
      </div>
      <n-input
        ref="quickSearchInput"
        v-model:value="quickSearchQuery"
        placeholder="搜索网站、密码、代码片段、文档..."
        size="large"
        clearable
        @keydown="handleQuickSearchKeydown"
        @focus="handleSearchFocus"
        @blur="handleSearchBlur"
      >
        <template #suffix>
          <n-button
            text
            @mousedown.prevent
            @click="handleOpenSettings"
            class="settings-icon"
          >
            <template #icon>
              <n-icon size="18"><SettingsOutline /></n-icon>
            </template>
          </n-button>
        </template>
      </n-input>
    </div>

    <div
      class="command-list"
      v-if="isInputFocused && quickResults.length > 0"
      ref="resultsContainerRef"
    >
      <div
        v-for="(item, index) in quickResults"
        :key="item.type + '-' + item.id"
        :ref="el => resultItemRefs[index] = el"
        :class="['command-item', { selected: index === selectedResultIndex }]"
        @click="handleQuickResultSelect(item)"
        @mousedown.prevent
        @mouseenter="selectedResultIndex = index"
      >
        <div class="command-icon">
          <n-avatar
            v-if="item.type === 'website' || item.type === 'bookmark'"
            :src="item.favicon"
            :size="18"
            round
          />
          <n-avatar
            v-else-if="item.type === 'app'"
            :src="item.favicon"
            :size="18"
            round
          />
          <n-icon v-else-if="item.type === 'password'" size="18"><KeyOutline /></n-icon>
          <n-icon v-else-if="item.type === 'document'" size="18"><DocumentOutline /></n-icon>
          <n-icon v-else-if="item.type === 'local-folder'" size="18"><FolderOutline /></n-icon>
          <n-icon v-else-if="item.type === 'default-search'" size="18"><SearchOutline /></n-icon>
          <n-icon v-else-if="item.type === 'direct-url'" size="18"><GlobeOutline /></n-icon>
          <n-icon v-else size="18"><CodeSlashOutline /></n-icon>
        </div>
        <div class="command-content">
          <div class="command-name">{{ item.name }}</div>
          <div class="command-desc" v-if="item.subtitle">{{ item.subtitle }}</div>
        </div>
        <!-- <div class="command-shortcut" v-if="item.typeLabel">
          {{ item.typeLabel }}
        </div> -->
      </div>
    </div>

    <div class="command-empty" v-else-if="isInputFocused && quickSearchQuery && quickResults.length === 0">
      <n-text depth="3">未找到匹配的结果</n-text>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { storeToRefs } from "pinia";
import {
  NInput,
  NButton,
  NIcon,
  NAvatar,
  NText
} from "naive-ui";
import {
  SearchOutline,
  SettingsOutline,
  KeyOutline,
  CodeSlashOutline,
  EnterOutline,
  DocumentOutline,
  GlobeOutline,
  FolderOutline
} from "@vicons/ionicons5";
import { useDataStore } from "../store/data";

const emit = defineEmits(["openSettings", "navigateTo", "updateSize", "clearSearch"]);

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
});

const dataStore = useDataStore();
const { websites, passwords, snippets, documents } = storeToRefs(dataStore);

const quickSearchInput = ref(null);
const quickSearchQuery = ref("");
const selectedResultIndex = ref(0);
const quickLaunchRef = ref(null);
const isInputFocused = ref(false);
const resultsContainerRef = ref(null);
const resultItemRefs = ref([]);

const truncateUrl = (url, maxLength = 40) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const display = urlObj.hostname + urlObj.pathname;
    if (display.length <= maxLength) return display;
    return display.substring(0, maxLength) + '...';
  } catch {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }
};

const isValidUrl = (str) => {
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      new URL(str);
      return true;
    }
    const urlWithProtocol = 'https://' + str;
    const url = new URL(urlWithProtocol);
    const hostname = url.hostname;
    if (hostname.includes('.') && hostname.split('.').pop().length >= 2) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

const isValidLocalPath = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  const windowsPathRegex = /^[a-zA-Z]:[/\\].+/;
  if (!windowsPathRegex.test(trimmed)) return false;
  const normalizedPath = trimmed.replace(/\//g, '\\');
  return normalizedPath;
};

const normalizeUrl = (str) => {
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  return 'https://' + str;
};

const quickResults = computed(() => {
  const results = [];
  const query = quickSearchQuery.value.trim();

  if (!query) {
    const sortedWebsites = [...websites.value]
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

    results.push(
      ...sortedWebsites.slice(0, 8).map((w) => ({
        ...w,
        type: w.type === "app" ? "app" : (w.type === "bookmark" ? "bookmark" : "website"),
        typeLabel: w.type === "app" ? "应用" : (w.type === "bookmark" ? "书签" : "网站"),
        name: w.name,
        subtitle: w.type === "app" ? "本地应用" : (w.type === "bookmark" ? truncateUrl(w.url) : (w.alias || truncateUrl(w.url)))
      }))
    );
    return results.slice(0, 8);
  }

  const spaceIndex = query.indexOf(' ');
  if (spaceIndex > 0) {
    const prefix = query.substring(0, spaceIndex).toLowerCase();
    const searchTerm = query.substring(spaceIndex + 1);
    
    const matchedWebsites = websites.value.filter(w => 
      w.type !== 'app' && 
      w.search_url && 
      (w.name?.toLowerCase().includes(prefix) || w.alias?.toLowerCase().includes(prefix))
    );
    
    if (matchedWebsites.length > 0 && searchTerm) {
      const firstMatch = matchedWebsites[0]
      return [{
        ...firstMatch,
        type: 'website',
        typeLabel: '搜索',
        name: `${firstMatch.name} 搜索: ${searchTerm}`,
        subtitle: `在 ${firstMatch.name} 中搜索`,
        isSearch: true,
        searchTerm: searchTerm
      }];
    }
  }

  websites.value.forEach((w) => {
    const searchPrefix = spaceIndex > 0 ? query.substring(0, spaceIndex).toLowerCase() : query
    if (
      w.name?.toLowerCase().includes(searchPrefix) ||
      w.alias?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...w,
        type: w.type === "app" ? "app" : "website",
        typeLabel: w.type === "app" ? "应用" : "网站",
        name: w.name,
        subtitle: w.type === "app" ? "本地应用" : (w.alias || truncateUrl(w.url))
      });
    }
  });

  passwords.value.forEach((p) => {
    const name = p.title || p.website_name || p.username;
    const searchPrefix = spaceIndex > 0 ? query.substring(0, spaceIndex).toLowerCase() : query
    if (
      name?.toLowerCase().includes(searchPrefix) ||
      p.username?.toLowerCase().includes(searchPrefix) ||
      p.website_url?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...p,
        type: "password",
        typeLabel: "密码",
        name: name,
        subtitle: p.username
      });
    }
  });

  snippets.value.forEach((s) => {
    const searchPrefix = spaceIndex > 0 ? query.substring(0, spaceIndex).toLowerCase() : query
    if (
      s.title?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...s,
        type: "snippet",
        typeLabel: "代码",
        name: s.title,
        subtitle: s.language
      });
    }
  });

  documents.value.forEach((d) => {
    const searchPrefix = spaceIndex > 0 ? query.substring(0, spaceIndex).toLowerCase() : query
    if (
      d.title?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...d,
        type: "document",
        typeLabel: "文档",
        name: d.title,
        subtitle: d.source_url || '文档'
      });
    }
  });

  if (results.length === 0 && query) {
    const localPath = isValidLocalPath(query);
    if (localPath) {
      results.push({
        id: 'local-folder',
        type: 'local-folder',
        typeLabel: '文件夹',
        name: `打开文件夹: ${localPath}`,
        subtitle: localPath,
        path: localPath
      });
    } else if (isValidUrl(query)) {
      results.push({
        id: 'direct-url',
        type: 'direct-url',
        typeLabel: '访问',
        name: `访问: ${query}`,
        subtitle: normalizeUrl(query),
        url: normalizeUrl(query)
      });
    } else {
      results.push({
        id: 'default-search',
        type: 'default-search',
        typeLabel: '搜索',
        name: `在浏览器中搜索: ${query}`,
        subtitle: '必应搜索',
        searchTerm: query
      });
    }
  }

  return results.slice(0, 8);
});

const updateWindowSize = () => {
  nextTick(() => {
    if (quickLaunchRef.value) {
      const rect = quickLaunchRef.value.getBoundingClientRect();
      const height = Math.round(rect.height);
      emit("updateSize", height);
      window.electronAPI?.resizeSearchWindow(height);
    }
  });
};

const handleQuickResultSelect = (item) => {
  quickSearchQuery.value = '';
  if (item.type === 'local-folder' && item.path) {
    window.electronAPI?.openFolder(item.path);
  } else if (item.type === 'direct-url' && item.url) {
    window.electronAPI?.openExternal(item.url);
  } else if (item.type === 'default-search' && item.searchTerm) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(item.searchTerm)}`;
    window.electronAPI?.openExternal(searchUrl);
  } else if (item.isSearch && item.search_url && item.searchTerm) {
    const searchUrl = item.search_url.replace('{query}', encodeURIComponent(item.searchTerm));
    window.electronAPI?.openExternal(searchUrl);
  } else if (item.type === "website" && item.url) {
    window.electronAPI?.openExternal(item.url);
  } else if (item.type === "app" && item.app_path) {
    window.electronAPI?.openApp(item.app_path);
  } else if (item.type === "password") {
    emit("navigateTo", { type: "password", id: item.id });
  } else if (item.type === "snippet") {
    emit("navigateTo", { type: "snippet", id: item.id });
  } else if (item.type === "document") {
    emit("navigateTo", { type: "document", id: item.id });
  }
};

const handleQuickSearchKeydown = (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (selectedResultIndex.value < quickResults.value.length - 1) {
      selectedResultIndex.value++;
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (selectedResultIndex.value > 0) {
      selectedResultIndex.value--;
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (quickResults.value.length > 0) {
      handleQuickResultSelect(quickResults.value[selectedResultIndex.value]);
    }
  }
};

const handleSearchFocus = () => {
  isInputFocused.value = true;
  nextTick(updateWindowSize);
};

const handleSearchBlur = () => {
  setTimeout(() => {
    isInputFocused.value = false;
    nextTick(updateWindowSize);
  }, 150);
};

const handleOpenSettings = () => {
  emit("openSettings");
};

const scrollToSelectedResult = () => {
  nextTick(() => {
    const selectedItem = resultItemRefs.value[selectedResultIndex.value];
    if (selectedItem && resultsContainerRef.value) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
};

const focusInput = () => {
  quickSearchInput.value?.focus();
};

const selectInput = () => {
  quickSearchInput.value?.select();
};

const clearSearch = () => {
  quickSearchQuery.value = "";
  isInputFocused.value = false;
  nextTick(updateWindowSize);
};

watch(quickSearchQuery, () => {
  selectedResultIndex.value = 0;
  resultItemRefs.value = [];
  if (isInputFocused.value) {
    nextTick(updateWindowSize);
  }
});

watch(selectedResultIndex, () => {
  scrollToSelectedResult();
});

watch(quickResults, () => {
  nextTick(updateWindowSize);
});

watch(isInputFocused, () => {
  nextTick(updateWindowSize);
});

onMounted(() => {
  nextTick(() => {
    quickSearchInput.value?.focus();
    updateWindowSize();
  });
});

defineExpose({
  focusInput,
  selectInput,
  clearSearch,
  updateWindowSize
});
</script>

<style scoped>
.quick-launch-mode {
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 10px;
}

.quick-launch-mode.dark-mode {
  background: transparent;
}

.search-box {
  background: rgba(255, 255, 255, 0.98);
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  padding: 8px;
  -webkit-app-region: no-drag;
  transition: background 0.3s, box-shadow 0.3s;
  display: flex;
  align-items: center;
}

.search-box.dark-mode {
  background: rgba(30, 30, 30, 0.98);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.search-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  -webkit-user-select: none;
}

.search-box :deep(.n-input) {
  --n-height: 48px;
  --n-font-size: 15px;
  flex: 1;
}

.search-box.dark-mode :deep(.n-input) {
  --n-color: transparent;
  --n-text-color: #ffffff;
  --n-placeholder-color: rgba(255, 255, 255, 0.5);
}

.search-box :deep(.n-input .n-input__border),
.search-box :deep(.n-input .n-input__state-border) {
  border: none;
  box-shadow: none;
}

.settings-icon {
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: var(--text-muted);
  transition: all 0.2s;
}

.settings-icon:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.search-box.dark-mode .settings-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.command-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.command-item:hover,
.command-item.selected {
  background: var(--primary-light);
}

.command-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--bg-color);
  margin-right: 12px;
  color: var(--primary-color);
}

.command-content {
  flex: 1;
  min-width: 0;
}

.command-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-desc {
  font-size: 12px;
  color: var(--text-color-3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* .command-shortcut {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-color);
  border-radius: 4px;
  color: var(--text-color-3);
} */

.command-empty {
  padding: 32px;
  text-align: center;
  background: rgba(255, 255, 255, 0.98);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

@media (max-width: 768px) {
  .search-box :deep(.n-input) {
    --n-height: 40px;
    --n-font-size: 14px;
  }
  
  .command-item {
    padding: 8px 12px;
  }
  
  .command-icon {
    width: 28px;
    height: 28px;
    margin-right: 10px;
  }
}
</style>
