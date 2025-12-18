import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../config/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'initiate' | 'verify'>('initiate');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
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

  const handleInitiate = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${apiClient.defaults.baseURL}/api/auth/change-password/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        setStep('verify');
        setTimeRemaining(600);
      } else {
        setMessage(data.message || 'Failed to send verification code');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !newPassword || !confirmPassword) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setMessage('Verification code must be exactly 6 digits');
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
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${apiClient.defaults.baseURL}/api/auth/change-password/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code.trim(),
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password changed successfully!');
        setMessageType('success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to change password');
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
    setStep('initiate');
    setCode('');
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
          <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'initiate' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Secure Password Change</p>
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
                {messageType === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : messageType === 'error' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : null}
                <span className="text-sm">{message}</span>
              </div>
            )}

            <button
              onClick={handleInitiate}
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmChange} className="space-y-4">
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="verify-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
              />
              {timeRemaining > 0 && (
                <p className="mt-2 text-xs text-gray-600">
                  Code expires in: <span className="font-semibold text-yellow-600">{formatTime(timeRemaining)}</span>
                </p>
              )}
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
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  placeholder="Confirm password"
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
                {messageType === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : messageType === 'error' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : null}
                <span className="text-sm">{message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('initiate')}
                disabled={loading}
                className="flex-1 text-gray-700 font-semibold py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
