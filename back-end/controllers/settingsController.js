import SiteSettings from '../models/SiteSettings.js';

// Get all settings (public - for frontend to load)
export const getSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ success: false, message: 'Failed to load settings' });
    }
};

// Update settings (admin only)
export const updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        let settings = await SiteSettings.findOne();
        
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        // Deep merge updates
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
                settings[key] = { ...settings[key].toObject(), ...updates[key] };
            } else {
                settings[key] = updates[key];
            }
        });

        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};

// Update specific section
export const updateSection = async (req, res) => {
    try {
        const { section } = req.params;
        const updates = req.body;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        if (settings[section] !== undefined) {
            if (typeof updates === 'object' && !Array.isArray(updates)) {
                settings[section] = { ...settings[section].toObject(), ...updates };
            } else {
                settings[section] = updates;
            }
            await settings.save();
            res.json(settings);
        } else {
            res.status(400).json({ success: false, message: 'Invalid section' });
        }
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({ success: false, message: 'Failed to update section' });
    }
};

// Get specific section
export const getSection = async (req, res) => {
    try {
        const { section } = req.params;
        const settings = await SiteSettings.getSettings();
        
        if (settings[section] !== undefined) {
            res.json({ success: true, [section]: settings[section] });
        } else {
            res.status(400).json({ success: false, message: 'Invalid section' });
        }
    } catch (error) {
        console.error('Error getting section:', error);
        res.status(500).json({ success: false, message: 'Failed to load section' });
    }
};

// Add FAQ
export const addFAQ = async (req, res) => {
    try {
        const { question, answer, category } = req.body;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        settings.faqs.push({ question, answer, category: category || 'general', isActive: true });
        await settings.save();
        
        res.json(settings);
    } catch (error) {
        console.error('Error adding FAQ:', error);
        res.status(500).json({ success: false, message: 'Failed to add FAQ' });
    }
};

// Update FAQ
export const updateFAQ = async (req, res) => {
    try {
        const { faqId } = req.params;
        const updates = req.body;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        const faqIndex = settings.faqs.findIndex(f => f._id.toString() === faqId);
        if (faqIndex === -1) {
            return res.status(404).json({ success: false, message: 'FAQ not found' });
        }

        Object.assign(settings.faqs[faqIndex], updates);
        await settings.save();
        
        res.json(settings);
    } catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ success: false, message: 'Failed to update FAQ' });
    }
};

// Delete FAQ
export const deleteFAQ = async (req, res) => {
    try {
        const { faqId } = req.params;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        settings.faqs = settings.faqs.filter(f => f._id.toString() !== faqId);
        await settings.save();
        
        res.json(settings);
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ success: false, message: 'Failed to delete FAQ' });
    }
};

// Add admission requirement
export const addRequirement = async (req, res) => {
    try {
        const { name, required } = req.body;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        settings.admissions.requirements.push({ name, required: required !== false });
        await settings.save();
        
        res.json(settings);
    } catch (error) {
        console.error('Error adding requirement:', error);
        res.status(500).json({ success: false, message: 'Failed to add requirement' });
    }
};

// Delete admission requirement
export const deleteRequirement = async (req, res) => {
    try {
        const { index } = req.params;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.getSettings();
        }

        settings.admissions.requirements.splice(parseInt(index), 1);
        await settings.save();
        
        res.json(settings);
    } catch (error) {
        console.error('Error deleting requirement:', error);
        res.status(500).json({ success: false, message: 'Failed to delete requirement' });
    }
};

// Reset to defaults
export const resetToDefaults = async (req, res) => {
    try {
        await SiteSettings.deleteMany({});
        const settings = await SiteSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ success: false, message: 'Failed to reset settings' });
    }
};
