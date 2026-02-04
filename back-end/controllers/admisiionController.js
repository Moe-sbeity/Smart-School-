import Admission from '../models/admission.js';

export const submitAdmission = async (req, res) => {
    try {
        const { fullName, email, grade, intendedStart, notes } = req.body;

        if (!fullName || !email || !grade || !intendedStart) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const existingApplication = await Admission.findOne({
            email,
            status: { $in: ['pending', 'reviewed'] }
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'An application with this email is already in progress'
            });
        }

        const admission = await Admission.create({
            fullName,
            email,
            grade,
            intendedStart,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            admission
        });

    } catch (error) {
        console.error('Error submitting admission:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message
        });
    }
};

export const getAllAdmissions = async (req, res) => {
    try {
        const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

        // Build query
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const admissions = await Admission.find(query)
            .populate('reviewedBy', 'name email')
            .sort(sortOptions);

        res.json({
            success: true,
            count: admissions.length,
            admissions
        });

    } catch (error) {
        console.error('Error fetching admissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admissions',
            error: error.message
        });
    }
};

export const getAdmissionById = async (req, res) => {
    try {
        const admission = await Admission.findById(req.params.id)
            .populate('reviewedBy', 'name email');

        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            admission
        });

    } catch (error) {
        console.error('Error fetching admission:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admission',
            error: error.message
        });
    }
};

export const updateAdmissionStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const admissionId = req.params.id;

        const validStatuses = ['pending', 'reviewed', 'missing-docs', 'accepted', 'rejected'];
        
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const updateData = {};
        
        if (status) {
            updateData.status = status;
            updateData.reviewedBy = req.user._id;
            updateData.reviewDate = new Date();
        }
        
        if (adminNotes !== undefined) {
            updateData.adminNotes = adminNotes;
        }

        const admission = await Admission.findByIdAndUpdate(
            admissionId,
            updateData,
            { new: true, runValidators: true }
        ).populate('reviewedBy', 'name email');

        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            message: 'Admission updated successfully',
            admission
        });

    } catch (error) {
        console.error('Error updating admission:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating admission',
            error: error.message
        });
    }
};

export const deleteAdmission = async (req, res) => {
    try {
        const admission = await Admission.findByIdAndDelete(req.params.id);

        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            message: 'Admission deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting admission:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting admission',
            error: error.message
        });
    }
};

export const getAdmissionStats = async (req, res) => {
    try {
        const stats = await Admission.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await Admission.countDocuments();

        const formattedStats = {
            total,
            byStatus: {}
        };

        stats.forEach(stat => {
            formattedStats.byStatus[stat._id] = stat.count;
        });

        res.json({
            success: true,
            stats: formattedStats
        });

    } catch (error) {
        console.error('Error fetching admission stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};