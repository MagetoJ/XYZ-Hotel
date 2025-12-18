import React, { useState } from 'react';
import { apiClient } from '../config/api';
import { X, Mail, Lock, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [username, setUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [timeRemaining, setTimeRemaining] = useState(0);

  React.useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage('Please enter your username');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/api/auth/request-password-reset', {
        username: username.trim()
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        setMessageType('success');
        setStep('verify');
        setTimeRemaining(10 * 60); // 10 minutes in seconds
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to send reset code');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please check your connection and try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetCode.trim() || !newPassword || !confirmPassword) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (!/^\d{6}$/.test(resetCode)) {
      setMessage('Reset code must be exactly 6 digits');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 4) {
      setMessage('Password must be at least 4 characters long');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/api/auth/reset-password', {
        resetCode: resetCode,
        newPassword,
        username
      });

      if (response.ok) {
        setMessage('Password reset successful! You can now login with your new password.');
        setMessageType('success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to reset password');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('request');
    setUsername('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setTimeRemaining(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Password Reset</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="reset-username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="reset-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">What happens next:</p>
                  <ul className="mt-1 space-y-1 text-blue-700">
                    <li>• A 6-digit code will be sent to your registered email</li>
                    <li>• The code expires in 10 minutes</li>
                    <li>• Check your spam folder if you don't see the email</li>
                  </ul>
                </div>
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                messageType === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
                messageType === 'error' ? 'text-red-700 bg-red-50 border-red-200' :
                'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {messageType === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
                 messageType === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-yellow-500 hover:to-amber-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Send Reset Code
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to your email address
              </p>
              {timeRemaining > 0 && (
                <p className="text-sm text-yellow-600 mt-2 font-medium">
                  Code expires in: {formatTime(timeRemaining)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-2">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                id="reset-code"
                value={resetCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setResetCode(value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                messageType === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
                messageType === 'error' ? 'text-red-700 bg-red-50 border-red-200' :
                'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {messageType === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
                 messageType === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !resetCode || !newPassword || !confirmPassword}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-yellow-500 hover:to-amber-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleRequestReset}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium focus:outline-none focus:underline transition-colors"
                disabled={loading}
              >
                Didn't receive code? Send again
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}