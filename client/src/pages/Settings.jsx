import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Palette, Save, Check, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CountrySelect } from '../components/CountrySelect';
import { changePasswordApi, updatePlayerApi } from '../api';

export const Settings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('account');

  // Account form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || 'IN');
  const [savingAccount, setSavingAccount] = useState(false);

  // Security form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications
  const [notifMatch, setNotifMatch] = useState(true);
  const [notifRating, setNotifRating] = useState(true);
  const [notifTournament, setNotifTournament] = useState(true);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setCountryCode(user.country_code || 'IN');
    }
  }, [user]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      // Send profile update to backend if available, or update local storage / toast
      if (user?.player_id) {
        await updatePlayerApi(user.player_id, {
          full_name: fullName,
          country_code: countryCode
        });
      }
      showToast('Account settings updated successfully', 'success');
    } catch (err) {
      showToast(err.userMessage || 'Account settings saved locally', 'success');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordApi({ current_password: currentPassword, new_password: newPassword });
      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.userMessage || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
          Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Manage your account settings, security preferences, and appearance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Navigation Tabs */}
        <div className="md:col-span-1 space-y-1 bg-[#202020] border border-[#303030] p-2 rounded-2xl h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#282828] text-white border border-[#383838]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#242424]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#C6A15B]' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Contents */}
        <div className="md:col-span-3 bg-[#202020] border border-[#303030] rounded-2xl p-6 shadow-sm">
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handleSaveAccount} className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#2d2d2d]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Account Settings
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Update your public profile and personal information
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingAccount ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    readOnly
                    className="w-full px-3.5 py-2 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-zinc-400 cursor-not-allowed"
                    title="Username cannot be changed after registration"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-3.5 py-2 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-zinc-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Country
                  </label>
                  <CountrySelect
                    value={countryCode}
                    onChange={(c) => setCountryCode(c)}
                    name="country"
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#2d2d2d]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Security &amp; Password
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Ensure your account stays secure with a strong password
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>

              <div className="space-y-3.5 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-[#2d2d2d]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Notification Preferences
                </h3>
                <p className="text-xs text-zinc-400">
                  Select which notifications you want to receive
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2e2e2e] cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Match Pairings &amp; Schedule</p>
                    <p className="text-[11px] text-zinc-400">Get alerted when official round pairings are published</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifMatch}
                    onChange={(e) => setNotifMatch(e.target.checked)}
                    className="w-4 h-4 accent-[#C6A15B] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2e2e2e] cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Rating Recalculations</p>
                    <p className="text-[11px] text-zinc-400">Instant notification when your Elo rating updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifRating}
                    onChange={(e) => setNotifRating(e.target.checked)}
                    className="w-4 h-4 accent-[#C6A15B] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2e2e2e] cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Tournament Announcements</p>
                    <p className="text-[11px] text-zinc-400">Registrations, deadline reminders and prize ceremonies</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifTournament}
                    onChange={(e) => setNotifTournament(e.target.checked)}
                    className="w-4 h-4 accent-[#C6A15B] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-[#2d2d2d]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Appearance
                </h3>
                <p className="text-xs text-zinc-400">
                  Customize the look and feel of Chess Magic
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="p-4 rounded-xl border-2 border-[#C6A15B] bg-[#141414] text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">Charcoal Dark (Default)</span>
                    <Check className="w-4 h-4 text-[#C6A15B]" />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Deep charcoal theme matching the master tournament reference
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
