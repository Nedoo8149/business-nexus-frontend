import React, { useState, useRef, useEffect } from 'react';
import {
  User, Lock, Bell, Globe, Palette, CreditCard,
  Camera, Check, X, Eye, EyeOff, Loader2,
  Upload, Trash2, Shield, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface MessageState {
  type: 'success' | 'error';
  text: string;
}

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth(); // FIXED: updateUser replaced with updateProfile
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<MessageState | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<MessageState | null>(null);

  // Track if name or bio changed
  const profileChanged = name !== (user?.name || '') || bio !== (user?.bio || '') || avatarFile !== null;

  // Auto-dismiss messages
  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => setProfileMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage]);

  useEffect(() => {
    if (passwordMessage) {
      const timer = setTimeout(() => setPasswordMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  if (!user) return null;

  // ==========================================
  // AVATAR HANDLING
  // ==========================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileMessage(null);

    // Size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'File size must be less than 5MB' });
      return;
    }

    // Type check
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Only image files are allowed' });
      return;
    }

    setAvatarFile(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ==========================================
  // SAVE PROFILE
 const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      let latestUser: any = { ...user };
      let newAvatarUrl = user.avatarUrl; // Default purani photo

      // Step 1: Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('userId', user.id); 

        const avatarRes = await fetch(`${API_URL}/api/users/avatar-upload`, {
          method: 'POST', 
          body: formData,
        });

        const avatarData = await avatarRes.json();

        if (!avatarRes.ok) {
          throw new Error(avatarData?.error || 'Avatar upload failed');
        }

        // ✅ FIX: Backend se aane wale URL ko har haal mein pakarhna
        const uploadedUrl = avatarData.avatarUrl || avatarData.url || avatarData.user?.avatarUrl;
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        }
      }

      // Step 2: Update name and bio
      const profileRes = await fetch(`${API_URL}/api/users/update-profile-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name.trim(),
          bio: bio.trim(),
        }),
      });

      const profileData = await profileRes.json();

      if (!profileRes.ok) {
        throw new Error(profileData?.error || 'Profile update failed');
      }

      // ✅ STEP 3: FORCE UPDATE - Context ko confirm naya URL aur Naam bhej rahe hain
      const finalUpdatedUser = {
        ...latestUser,
        ...profileData.user,
        id: user.id,
        name: name.trim() || user.name,           
        bio: bio.trim() || user.bio,              
        avatarUrl: newAvatarUrl // Har haal mein naya URL apply hoga
      };

      await updateProfile(user.id, finalUpdatedUser);

      setAvatarFile(null);
      setAvatarPreview(null);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (error: any) {
      console.error("❌ Save Profile Error:", error);
      setProfileMessage({ type: 'error', text: error.message || 'Something went wrong' });
    } finally {
      setProfileLoading(false);
    }
  };
  // ==========================================
  // PASSWORD VALIDATION (Real-time)
  // ==========================================
  const passwordValidations = {
    hasCurrent: currentPassword.length > 0,
    minLength: newPassword.length >= 6,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    passwordsMatch: newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword,
    isDifferent: currentPassword.length > 0 && newPassword.length > 0 && currentPassword !== newPassword,
  };

  const isPasswordFormValid =
    passwordValidations.hasCurrent &&
    passwordValidations.minLength &&
    passwordValidations.passwordsMatch &&
    passwordValidations.isDifferent;

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================
  const handleChangePassword = async () => {
    if (!isPasswordFormValid) {
      setPasswordMessage({ type: 'error', text: 'Please fix the validation errors above' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/users/change-user-password`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    currentPassword,
    newPassword,
  }),
});

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Password change failed');
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || 'Something went wrong' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // ==========================================
  // TABS CONFIG
  // ==========================================
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  // ==========================================
  // VALIDATION ITEM COMPONENT
  // ==========================================
  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-green-600' : 'text-gray-400'}`}>
      {valid ? <Check size={14} /> : <X size={14} />}
      <span>{text}</span>
    </div>
  );

  // ==========================================
  // MESSAGE TOAST COMPONENT
  // ==========================================
  const MessageToast = ({ message }: { message: MessageState }) => (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium animate-fade-in ${message.type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
      }`}>
      {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {message.text}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon size={18} className="mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </CardBody>
        </Card>

        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ==========================================
              PROFILE SETTINGS TAB
              ========================================== */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* Message Toast */}
                {profileMessage && <MessageToast message={profileMessage} />}

                {/* Avatar Upload Section */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar
                      // Yahan bhi check laga diya ke aadha URL na jaye
                      src={avatarPreview || (user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`)}
                      alt={name || user.name}
                      size="xl"
                    />
                    {/* Overlay on hover */}
                    <div
                      onClick={triggerFileInput}
                      className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera size={24} className="text-white" />
                    </div>
                    {/* Green dot indicator if new photo selected */}
                    {avatarPreview && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Hidden file input - works on ALL devices */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                        className="flex items-center gap-2"
                      >
                        <Upload size={16} />
                        Upload Photo
                      </Button>

                      {avatarPreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      JPG, PNG, GIF or WEBP. Max 5MB
                    </p>
                    <p className="text-xs text-gray-400">
                      Works on mobile, tablet & desktop
                    </p>
                  </div>
                </div>

                {/* Name & Email Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 border"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 border text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={user.role}
                      disabled
                      className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 border text-gray-500 cursor-not-allowed capitalize"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      defaultValue="San Francisco, CA"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 border"
                    />
                  </div>
                </div>

                {/* Bio Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 border"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell something about yourself..."
                  />
                  <p className="text-xs text-gray-400 mt-1">{bio.length}/500 characters</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setName(user.name || '');
                      setBio(user.bio || '');
                      handleRemoveAvatar();
                      setProfileMessage(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!profileChanged || profileLoading}
                    className="flex items-center gap-2"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ==========================================
              SECURITY SETTINGS TAB
              ========================================== */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* Two-Factor Auth */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Add an extra layer of security to your account
                      </p>
                      <Badge variant="error" className="mt-1">Not Enabled</Badge>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </div>

                {/* Change Password Section */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={20} className="text-gray-700" />
                    <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
                  </div>

                  {/* Password Message Toast */}
                  {passwordMessage && <MessageToast message={passwordMessage} />}

                  <div className="space-y-4 max-w-md">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setPasswordMessage(null);
                          }}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 border pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {currentPassword.length > 0 && (
                        <ValidationItem
                          valid={passwordValidations.hasCurrent}
                          text="Current password entered"
                        />
                      )}
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordMessage(null);
                          }}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 border pr-10"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Real-time password strength indicators */}
                      {newPassword.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <ValidationItem
                            valid={passwordValidations.minLength}
                            text="At least 6 characters"
                          />
                          <ValidationItem
                            valid={passwordValidations.hasUppercase}
                            text="Contains uppercase letter"
                          />
                          <ValidationItem
                            valid={passwordValidations.hasNumber}
                            text="Contains a number"
                          />
                          <ValidationItem
                            valid={passwordValidations.isDifferent}
                            text="Different from current password"
                          />
                        </div>
                      )}

                      {/* Password strength bar */}
                      {newPassword.length > 0 && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => {
                              const filled = (
                                (passwordValidations.minLength ? 1 : 0) +
                                (passwordValidations.hasUppercase ? 1 : 0) +
                                (passwordValidations.hasNumber ? 1 : 0) +
                                (passwordValidations.isDifferent ? 1 : 0)
                              ) >= level;

                              const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
                              return (
                                <div
                                  key={level}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${filled ? colors[level - 1] : 'bg-gray-200'}`}
                                />
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {(
                              (passwordValidations.minLength ? 1 : 0) +
                              (passwordValidations.hasUppercase ? 1 : 0) +
                              (passwordValidations.hasNumber ? 1 : 0) +
                              (passwordValidations.isDifferent ? 1 : 0)
                            ) <= 1 && 'Weak'}
                            {(
                              (passwordValidations.minLength ? 1 : 0) +
                              (passwordValidations.hasUppercase ? 1 : 0) +
                              (passwordValidations.hasNumber ? 1 : 0) +
                              (passwordValidations.isDifferent ? 1 : 0)
                            ) === 2 && 'Fair'}
                            {(
                              (passwordValidations.minLength ? 1 : 0) +
                              (passwordValidations.hasUppercase ? 1 : 0) +
                              (passwordValidations.hasNumber ? 1 : 0) +
                              (passwordValidations.isDifferent ? 1 : 0)
                            ) === 3 && 'Good'}
                            {(
                              (passwordValidations.minLength ? 1 : 0) +
                              (passwordValidations.hasUppercase ? 1 : 0) +
                              (passwordValidations.hasNumber ? 1 : 0) +
                              (passwordValidations.isDifferent ? 1 : 0)
                            ) === 4 && 'Strong'} password
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordMessage(null);
                          }}
                          className={`w-full rounded-md shadow-sm focus:ring-primary-500 px-3 py-2 border pr-10 ${confirmPassword.length > 0 && !passwordValidations.passwordsMatch
                              ? 'border-red-300 focus:border-red-500'
                              : confirmPassword.length > 0 && passwordValidations.passwordsMatch
                                ? 'border-green-300 focus:border-green-500'
                                : 'border-gray-300 focus:border-primary-500'
                            }`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Match indicator */}
                      {confirmPassword.length > 0 && (
                        <ValidationItem
                          valid={passwordValidations.passwordsMatch}
                          text={passwordValidations.passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                        />
                      )}
                    </div>

                    {/* Submit Password Change */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={!isPasswordFormValid || passwordLoading}
                        className="flex items-center gap-2"
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <Lock size={16} />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ==========================================
              NOTIFICATIONS TAB
              ========================================== */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {[
                    { label: 'Email Notifications', desc: 'Receive email updates about your account' },
                    { label: 'Push Notifications', desc: 'Get push notifications on your device' },
                    { label: 'SMS Notifications', desc: 'Receive SMS for critical alerts' },
                    { label: 'Chat Messages', desc: 'Notify when you receive new messages' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={idx < 2} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Other tabs placeholder */}
          {['language', 'appearance', 'billing'].includes(activeTab) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 capitalize">{activeTab} Settings</h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe size={48} className="text-gray-300 mb-4" />
                  <p className="text-gray-500">This section is coming soon.</p>
                  <p className="text-gray-400 text-sm mt-1">We're working on it!</p>
                </div>
              </CardBody>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};