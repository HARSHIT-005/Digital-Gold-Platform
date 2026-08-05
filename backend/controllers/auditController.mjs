// 🔍 Audit Log Controller (minor style tweaks - no logic change)
import AuditLog from "../models/AuditLog.mjs";
import User from "../models/User.mjs";

export const getAuditLogs = async (req, res, next) => {
  try {
    const { 
      action, 
      targetModel, 
      performedBy, 
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (targetModel) filter.targetModel = targetModel;
    if (performedBy) filter.performedBy = performedBy;

    const logs = await AuditLog.find(filter)
      .populate("performedBy", "name email role") // switched quotes + added spacing
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)); // parseInt for pagination

    // ✅ Return latest audit logs
    res.status(200).json(logs);
  } catch (err) {
    next(err);  // error forwarded to middleware
  }
};
