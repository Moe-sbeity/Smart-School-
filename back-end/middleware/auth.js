// protectRoute.js
import jwt from "jsonwebtoken";
import UserModel from "../models/UserModels.js";

export const protectRoute = async (req, res, next) => {
  try {
  
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies.jwt;


    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;        // ✅ Now req.user is available
    req.userId = decoded.id;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    // Add safety check for req.user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    } 
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can access this resource." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isTeacher = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Only teachers can access this resource." });
    }
    next();

  }
  catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
export const isStudent = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied. Only students can access this resource." });
    }
    next();
  }
  catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
export const isParent = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied. Only parents can access this resource." });
    }
    next();
  }
  catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}