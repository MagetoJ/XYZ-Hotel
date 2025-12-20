import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, AlertTriangle, Building, Percent, FileText, Upload, Check, X } from 'lucide-react';
import { API_URL } from '../../config/api';

interface AppSettings {
    [key: string]: string | number | boolean;
}

export default function SettingsManagement() {
    const [settings, setSettings] = useState<AppSettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getToken = () => localStorage.getItem('pos_token');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/settings`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Failed to load settings.');
            const data = await response.json();
            setSettings(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (key: string, value: string | number | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(settings)
            });
            if (!response.ok) throw new Error('Failed to save settings.');
            setSuccess('Settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Logo file must be less than 5MB');
            return;
        }

        setIsUploadingLogo(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch(`${API_URL}/api/settings/upload/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload logo');
            
            const data = await response.json();
            setSettings(prev => ({ ...prev, business_logo: data.logoPath }));
            setSuccess('Logo uploaded successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsUploadingLogo(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-800">Error</h3>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-green-800">Success</h3>
                        <p className="text-green-700 text-sm">{success}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                    <p className="text-gray-600">Configure general application settings and business information.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logo & Business Information */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Logo Section */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Logo</h3>
                        <div className="space-y-4">
                            {/* Logo Preview */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center h-40">
                                {settings.business_logo ? (
                                    <img 
                                        src={settings.business_logo as string} 
                                        alt="Business Logo" 
                                        className="max-h-32 max-w-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No logo uploaded</p>
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="w-full flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {isUploadingLogo ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload Logo
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP • Max 5MB</p>
                        </div>
                    </div>

                    {/* Business Information */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <Building className="w-6 h-6 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                        </div>
                        <div className="space-y-4">
                            <SettingInput 
                                label="Business Name" 
                                value={settings.business_name as string || ''} 
                                onChange={e => handleInputChange('business_name', e.target.value)} 
                                placeholder="e.g., XYZ Hotel"
                            />
                            <SettingInput 
                                label="Address" 
                                value={settings.business_address as string || ''} 
                                onChange={e => handleInputChange('business_address', e.target.value)} 
                            />
                            <SettingInput 
                                label="Phone Number" 
                                value={settings.business_phone as string || ''} 
                                onChange={e => handleInputChange('business_phone', e.target.value)} 
                            />
                            <SettingInput 
                                label="Currency" 
                                value={settings.currency || ''} 
                                onChange={e => handleInputChange('currency', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                {/* Financial & Receipt Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <Percent className="w-6 h-6 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Financial Settings</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingInput 
                                label="Service Charge Rate (%)" 
                                type="number" 
                                value={settings.service_charge_rate || ''} 
                                onChange={e => handleInputChange('service_charge_rate', parseFloat(e.target.value))} 
                            />
                            <SettingInput 
                                label="Max Discount (%)" 
                                type="number" 
                                value={settings.max_discount_percentage || ''} 
                                onChange={e => handleInputChange('max_discount_percentage', parseFloat(e.target.value))} 
                            />
                            <SettingInput 
                                label="Low Stock Threshold" 
                                type="number" 
                                value={settings.low_stock_threshold || ''} 
                                onChange={e => handleInputChange('low_stock_threshold', parseInt(e.target.value))} 
                            />
                            <SettingInput 
                                label="Minimum Order Amount" 
                                type="number" 
                                value={settings.minimum_order_amount || ''} 
                                onChange={e => handleInputChange('minimum_order_amount', parseFloat(e.target.value))} 
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="w-6 h-6 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Receipt Settings</h3>
                        </div>
                        <SettingInput 
                            label="Footer Message" 
                            value={settings.receipt_footer_text as string || ''} 
                            onChange={e => handleInputChange('receipt_footer_text', e.target.value)} 
                            placeholder="Thank you for your business!"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

const SettingInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            {...props}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
    </div>
);
