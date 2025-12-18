import { useState, useEffect } from 'react';
import { Save, Loader2, AlertTriangle, Building, Percent, FileText } from 'lucide-react';
import { API_URL } from '../../config/api';

interface AppSettings {
    [key: string]: string;
}

export default function SettingsManagement() {
    const [settings, setSettings] = useState<AppSettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

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

    const handleInputChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
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
            alert('Settings saved successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
    }

    if (error) {
        return <div className="text-center py-20 text-red-600 bg-red-50 p-4 rounded-lg"><AlertTriangle className="mx-auto w-8 h-8 mb-2" />{error}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                    <p className="text-gray-600">Configure general application settings.</p>
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
                {/* General Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <Building className="w-6 h-6 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                        </div>
                        <div className="space-y-4">
                            <SettingInput label="Business Name" value={settings.business_name || ''} onChange={e => handleInputChange('business_name', e.target.value)} />
                            <SettingInput label="Address" value={settings.business_address || ''} onChange={e => handleInputChange('business_address', e.target.value)} />
                            <SettingInput label="Phone Number" value={settings.business_phone || ''} onChange={e => handleInputChange('business_phone', e.target.value)} />
                            <SettingInput label="Currency Symbol" value={settings.currency_symbol || ''} onChange={e => handleInputChange('currency_symbol', e.target.value)} />
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
                            <SettingInput label="Service Charge (%)" type="number" value={settings.service_charge_percentage || ''} onChange={e => handleInputChange('service_charge_percentage', e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="w-6 h-6 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Receipt Settings</h3>
                        </div>
                        <SettingInput label="Footer Message" value={settings.receipt_footer_message || ''} onChange={e => handleInputChange('receipt_footer_message', e.target.value)} />
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
