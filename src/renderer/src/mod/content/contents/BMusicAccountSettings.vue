<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { 
    checkBilibiliLogin, logoutBilibili, getBilibiliProfile,
    checkNeteaseLogin, logoutNetease, getNeteaseProfile,
    getBMusicAccounts, getActiveBMusicAccount, createBMusicAccount, deleteBMusicAccount, switchBMusicAccount,
    notifyBMusicAccountChanged,
    type BMusicAccount
} from '@renderer/ipcApi/ipcAccountSettings';
import UniversalButton from '@renderer/components/UniversalButton.vue';
import { openPopUpComponent } from '@renderer/mod/popUp/popUp';
import { WebviewLogin } from '@renderer/mod/popUp/popUpComponents';

const accounts = ref<BMusicAccount[]>([]);
const activeAccount = ref<BMusicAccount | null>(null);
const newAccountName = ref('');

const isBilibiliLoggedIn = ref(false);
const isNeteaseLoggedIn = ref(false);
const bilibiliProfile = ref<{ username: string, avatar: string } | null>(null);
const neteaseProfile = ref<{ username: string, avatar: string } | null>(null);

async function loadBMusicAccounts() {
    accounts.value = await getBMusicAccounts();
    activeAccount.value = await getActiveBMusicAccount() || null;
}

async function checkCloudStatus() {
    const [bilibiliLoggedIn, neteaseLoggedIn] = await Promise.all([
        checkBilibiliLogin(),
        checkNeteaseLogin()
    ]);
    isBilibiliLoggedIn.value = bilibiliLoggedIn;
    isNeteaseLoggedIn.value = neteaseLoggedIn;

    const [bilibiliUserProfile, neteaseUserProfile] = await Promise.all([
        bilibiliLoggedIn ? getBilibiliProfile() : Promise.resolve(null),
        neteaseLoggedIn ? getNeteaseProfile() : Promise.resolve(null)
    ]);
    bilibiliProfile.value = bilibiliUserProfile;
    neteaseProfile.value = neteaseUserProfile;
}

async function handleCreateAccount() {
    if (!newAccountName.value.trim()) return;
    await createBMusicAccount(newAccountName.value.trim());
    newAccountName.value = '';
    await loadBMusicAccounts();
    await checkCloudStatus();
    notifyBMusicAccountChanged();
}

async function handleDeleteAccount(id: number) {
    if (accounts.value.length <= 1) {
        alert("无法删除最后一个账户");
        return;
    }
    if (confirm("确定要删除此账户吗？其绑定的网易云/B站状态也会被丢失。")) {
        await deleteBMusicAccount(id);
        await loadBMusicAccounts();
        await checkCloudStatus();
        notifyBMusicAccountChanged();
    }
}

async function handleSwitchAccount(id: number) {
    if (activeAccount.value?.id === id) return;
    await switchBMusicAccount(id);
    await loadBMusicAccounts();
    await checkCloudStatus();
    notifyBMusicAccountChanged();
}

onMounted(async () => {
    await loadBMusicAccounts();
    await checkCloudStatus();
});

function loginBilibili() {
    openPopUpComponent(WebviewLogin, {
        tag: 'bilibili',
        url: 'https://passport.bilibili.com/login',
        onSuccess: async () => {
             await checkCloudStatus();
        }
    });
}

function handleLogoutBilibili() {
    logoutBilibili().then(async () => {
        await checkCloudStatus();
    });
}

function loginNetease() {
    openPopUpComponent(WebviewLogin, {
        tag: 'netease',
        url: 'https://music.163.com/#/login',
        onSuccess: async () => {
             await checkCloudStatus();
        }
    });
}

function handleLogoutNetease() {
    logoutNetease().then(async () => {
        await checkCloudStatus();
    });
}
</script>

<template>
    <div class="settings-container">
        <h2 class="title">Bmusic 多账户管理</h2>

        <!-- Account List -->
        <div class="accounts-grid">
            <div 
                v-for="acc in accounts" 
                :key="acc.id" 
                class="account-card"
                :class="{ active: acc.id === activeAccount?.id }"
                @click="handleSwitchAccount(acc.id)"
            >
                <div class="acc-info">
                    <div class="acc-avatar">
                        {{ acc.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="acc-details">
                        <span class="acc-name">{{ acc.name }}</span>
                        <span class="acc-status">{{ acc.id === activeAccount?.id ? '当前使用中' : '点击切换' }}</span>
                    </div>
                </div>
                <div class="acc-actions" v-if="accounts.length > 1 && acc.id !== activeAccount?.id">
                    <button class="del-btn" @click.stop="handleDeleteAccount(acc.id)">删除</button>
                </div>
            </div>
        </div>

        <!-- Create Account -->
        <div class="create-account-box">
            <input class="create-input" type="text" v-model="newAccountName" placeholder="输入新账户名称" @keyup.enter="handleCreateAccount"/>
            <UniversalButton text="新建账户" @click="handleCreateAccount" type="ok" />
        </div>

        <hr class="divider"/>

        <!-- Active Account Bindings -->
        <div class="active-account-bindings" v-if="activeAccount">
            <h2 class="title" style="margin-bottom: 1rem; font-size: 1.3rem;">为 "{{ activeAccount.name }}" 绑定平台</h2>
            
            <div class="setting-item">
                <div class="info">
                    <span class="platform">Bilibili (B站)</span>
                    <div v-if="isBilibiliLoggedIn && bilibiliProfile" class="user-profile">
                        <img class="avatar" :src="bilibiliProfile.avatar" />
                        <span class="username">{{ bilibiliProfile.username }}</span>
                    </div>
                    <span v-else class="status" :class="{ active: isBilibiliLoggedIn }">
                        {{ isBilibiliLoggedIn ? '已绑定' : '未绑定' }}
                    </span>
                </div>
                <UniversalButton v-if="!isBilibiliLoggedIn" text="去绑定" @click="loginBilibili" type="ok" />
                <UniversalButton v-else text="解除绑定" @click="handleLogoutBilibili" type="other" />
            </div>

            <div class="setting-item">
                <div class="info">
                    <span class="platform">网易云音乐</span>
                    <div v-if="isNeteaseLoggedIn && neteaseProfile" class="user-profile">
                        <img class="avatar" :src="neteaseProfile.avatar" />
                        <span class="username">{{ neteaseProfile.username }}</span>
                    </div>
                    <span v-else class="status" :class="{ active: isNeteaseLoggedIn }">
                        {{ isNeteaseLoggedIn ? '已绑定' : '未绑定' }}
                    </span>
                </div>
                <UniversalButton v-if="!isNeteaseLoggedIn" text="去绑定" @click="loginNetease" type="ok" />
                <UniversalButton v-else text="解除绑定" @click="handleLogoutNetease" type="other" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-container {
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
    color: var(--universal-text-color, #333);
}

.title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 2rem;
    color: var(--color-pay-list-header-title-font);
}

.accounts-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.account-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-radius: 8px;
    background-color: var(--color-pay-list-search-bg, rgba(255, 255, 255, 0.05));
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
}

.account-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}

.account-card.active {
    border-color: var(--color-primary);
    background-color: var(--color-primary-with);
}

.acc-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.acc-avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
}

.acc-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.acc-name {
    font-size: 1.1rem;
    font-weight: bold;
}

.acc-status {
    font-size: 0.85rem;
    color: #888;
}
.account-card.active .acc-status {
    color: var(--color-primary);
}

.del-btn {
    background-color: #ff4d4f;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.9rem;
}
.del-btn:hover {
    background-color: #ff7875;
}

.create-account-box {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 2rem;
}

.create-input {
    flex: 1;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--color-pay-list-search-border, rgba(255, 255, 255, 0.1));
    background-color: var(--color-pay-list-search-bg, rgba(255, 255, 255, 0.05));
    color: var(--universal-text-color, #333);
    outline: none;
    font-size: 1rem;
}
.create-input:focus {
    border-color: var(--color-primary);
}

.divider {
    border: none;
    border-top: 1px solid var(--color-pay-list-search-border, rgba(255, 255, 255, 0.1));
    margin: 2rem 0;
}

/* Inherited Platform Styling */
.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background-color: var(--color-pay-list-search-bg, rgba(255, 255, 255, 0.05));
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid var(--color-pay-list-search-border, rgba(255, 255, 255, 0.1));
}
.info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.platform {
    font-size: 1.2rem;
    font-weight: 500;
}
.status {
    font-size: 0.9rem;
    color: #888;
}
.status.active {
    color: #4CAF50;
}
.user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
}
.user-profile .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-pay-list-search-border, rgba(255, 255, 255, 0.1));
}
.user-profile .username {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--universal-text-color, #333);
}
</style>
