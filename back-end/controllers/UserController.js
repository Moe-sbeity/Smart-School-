import UserModel from "../models/UserModels.js";
import ClassGradeModel from "../models/classGrade.js";
import CounterModel from "../models/counter.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";



const createToken = async (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};
export const LoginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email })
      .populate('children', '-password')
      .populate('parent', '-password');
      
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = await createToken(user._id);

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        mustChangePassword: user.mustChangePassword || false,
        ...(user.classGrade && { classGrade: user.classGrade }),
        ...(user.classSection && { classSection: user.classSection }),
        ...(user.subjects && { subjects: user.subjects }),
        ...(user.parent && { parent: user.parent }),
        ...(user.children && user.children.length > 0 && { children: user.children })
      },
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const register = async (req, res) => {
  try {
    const { 
      name, email, password, gender, dateOfBirth, role, 
      subjects, parentEmail, classGrade, classSection 
    } = req.body;

    // Debug logging - remove after fixing
    console.log('Registration request body:', req.body);
    console.log('Extracted values - name:', name, 'password:', password ? '[PRESENT]' : '[MISSING]', 'gender:', gender, 'role:', role);

    const emailDomains = {
      student: "@student.com",
      parent: "@parent.com",
      teacher: "@teacher.com",
      admin: "@admin.com"
    };

    // For students, auto-generate email using counter
    let finalEmail = email;
    if (role === 'student') {
      const studentId = await CounterModel.getNextSequence('studentId');
      finalEmail = `${studentId}@student.com`;
    } else {
      // For non-students, validate email domain
      if (!email.endsWith(emailDomains[role])) {
        return res.status(400).json({
          message: `Email for role ${role} must end with ${emailDomains[role]}`
        });
      }
    }

    if (!name || !password || !gender) {
      console.log('Validation failed - name:', !!name, 'password:', !!password, 'gender:', !!gender);
      return res.status(400).json({ message: "Please fill all fields" });
    }

    // dateOfBirth is required for non-students
    if (role !== 'student' && !dateOfBirth) {
      return res.status(400).json({ message: "Date of birth is required" });
    }

    // For non-students, email is required
    if (role !== 'student' && !email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const exist = await UserModel.findOne({ email: finalEmail });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (role === 'teacher') {
      if (!subjects || subjects.length === 0) {
        return res.status(400).json({ message: "Teachers must have at least one subject assigned" });
      }
    }

    // Validate classGrade for students (classSection is optional)
    if (role === 'student') {
      if (!classGrade) {
        return res.status(400).json({ message: "Students must have a class grade assigned" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle student registration with parent
    let parentId = null;
    let generatedParentEmail = null;
    
    if (role === 'student') {
      // Auto-generate parent email from student ID
      const studentIdNumber = finalEmail.split('@')[0]; // Extract "10000001" from "10000001@student.com"
      generatedParentEmail = `${studentIdNumber}@parent.com`;

      // Check if parent exists
      let parent = await UserModel.findOne({ email: generatedParentEmail });
      
      if (!parent) {
        // Create parent account automatically with SAME password as student
        // Set mustChangePassword flag so parent is prompted to change password on first login
        parent = new UserModel({
          name: `${name}'s Parent`,
          email: generatedParentEmail,
          password: hashedPassword,
          gender: 'male',
          dateOfBirth: new Date('1980-01-01'),
          role: 'parent',
          children: [],
          mustChangePassword: true  // Parent must change password on first login
        });

        await parent.save();
        console.log(`Parent account created for ${generatedParentEmail} with same password as student (must change on first login)`);
      } else {
        // Verify parent role
        if (parent.role !== 'parent') {
          return res.status(400).json({ message: "The provided email belongs to a non-parent user" });
        }
      }

      parentId = parent._id;
    }

    // Prepare user data
    const userData = {
      name,
      email: finalEmail,
      password: hashedPassword,
      gender,
      role: role || "student",
    };

    // Add dateOfBirth only if provided (students may not have it during registration)
    if (dateOfBirth) {
      userData.dateOfBirth = dateOfBirth;
    }

    // Add role-specific fields
    if (role === 'teacher' && subjects && subjects.length > 0) {
      userData.subjects = subjects;
    }

    if (role === 'student') {
      userData.parent = parentId;
      userData.classGrade = classGrade;
      userData.classSection = classSection;
    }

    const newUser = new UserModel(userData);
    const user = await newUser.save();

    // Update parent's children array
    if (role === 'student' && parentId) {
      await UserModel.findByIdAndUpdate(
        parentId,
        { $push: { children: user._id } }
      );

      // Create ClassGrade record for the student
      await ClassGradeModel.create({
        student: user._id,
        classGrade: classGrade,
        classSection: classSection
      });
    }

    const token = await createToken(user._id);

    return res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        ...(user.subjects && { subjects: user.subjects }),
        ...(user.parent && { parent: user.parent }),
        ...(user.classGrade && { classGrade: user.classGrade }),
        ...(user.classSection && { classSection: user.classSection }),
        ...(generatedParentEmail && { parentEmail: generatedParentEmail })
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: err.message });
  }
};


export const getUserInfo = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId)
      .select("-password")
      .populate('children', '-password')
      .populate('parent', '-password');
      
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    const filter = {};
    if (role) {
      filter.role = role;
    }

    const users = await UserModel.find(filter)
      .select('-password')
      .populate('children', '-password')
      .populate('parent', '-password');
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStudents = async (req, res) => {
  try {
    const students = await UserModel.find({ role: 'student' })
      .select('-password')
      .populate('parent', '-password')
      .sort({ name: 1 });
    
    res.status(200).json({ 
      students,
      count: students.length 
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTeachers = async (req, res) => {
  try {
    const teachers = await UserModel.find({ role: 'teacher' })
      .select('-password')
      .sort({ name: 1 });
    
    res.status(200).json({ 
      teachers,
      count: teachers.length 
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId)
      .select('-password')
      .populate('children', '-password')
      .populate('parent', '-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyChildren = async (req, res) => {
  try {
    const parent = await UserModel.findById(req.userId)
      .populate('children', '-password');
    
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parents only.' });
    }

    res.status(200).json({ 
      children: parent.children,
      count: parent.children.length 
    });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjectsEnum = UserModel.schema.path('subjects.0').enumValues;
    
    res.status(200).json({ 
      subjects: subjectsEnum,
      count: subjectsEnum.length 
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const DeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === 'student' && user.parent) {
      await UserModel.findByIdAndUpdate(
        user.parent,
        { $pull: { children: user._id } }
      );
    }

    
    if (user.role === 'parent' && user.children.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete parent with assigned children. Please reassign or remove children first." 
      });
    }

    await UserModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Logout user - clear JWT cookie
export const logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 0,
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update user profile (self update)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, gender, dateOfBirth } = req.body;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only allow updating certain fields
    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update user by ID (admin only)
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, dateOfBirth, subjects, classGrade, classSection } = req.body;
    
    // Check if requester is admin
    const requester = await UserModel.findById(req.userId);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;
    
    // Update teacher subjects
    if (user.role === 'teacher' && subjects) {
      user.subjects = subjects;
    }
    
    // Update student class info
    if (user.role === 'student') {
      if (classGrade !== undefined) user.classGrade = classGrade;
      if (classSection !== undefined) user.classSection = classSection;
    }

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        subjects: user.subjects,
        classGrade: user.classGrade,
        classSection: user.classSection
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ message: err.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;  // Clear the flag after password change
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update child's date of birth (for parents)
export const updateChildDob = async (req, res) => {
  try {
    const parentId = req.userId;
    const { childId } = req.params;
    const { dateOfBirth } = req.body;

    if (!dateOfBirth) {
      return res.status(400).json({ message: "Date of birth is required" });
    }

    // Verify the parent
    const parent = await UserModel.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: "Access denied. Only parents can update child's date of birth" });
    }

    // Check if this child belongs to the parent
    if (!parent.children.includes(childId)) {
      return res.status(403).json({ message: "You can only update your own child's information" });
    }

    // Update the child's date of birth
    const child = await UserModel.findById(childId);
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    child.dateOfBirth = new Date(dateOfBirth);
    await child.save();

    return res.status(200).json({ 
      message: "Date of birth updated successfully",
      user: {
        _id: child._id,
        name: child.name,
        dateOfBirth: child.dateOfBirth
      }
    });
  } catch (err) {
    console.error('Error updating child DOB:', err);
    return res.status(500).json({ message: err.message });
  }
};

// Get parents list (for admin when registering students)
export const getParents = async (req, res) => {
  try {
    const parents = await UserModel.find({ role: 'parent' })
      .select('-password')
      .populate('children', 'name email classGrade classSection')
      .sort({ name: 1 });
    
    res.status(200).json({ 
      parents,
      count: parents.length 
    });
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get the next student ID that will be assigned
 * This helps display the auto-generated email before registration
 */
export const getNextStudentId = async (req, res) => {
  try {
    const nextId = await CounterModel.getCurrentSequence('studentId');
    const nextStudentEmail = `${nextId}@student.com`;
    const nextParentEmail = `${nextId}@parent.com`;
    
    res.status(200).json({ 
      nextId,
      nextEmail: nextStudentEmail,
      nextStudentEmail,
      nextParentEmail,
      message: 'Next student ID retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting next student ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};