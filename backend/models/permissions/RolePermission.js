const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'director', 'teacher', 'student', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'],
    required: true,
    unique: true,
    index: true
  },
  // Map: { 'permission.key': boolean }
  permissions: {
    type: Map,
    of: Boolean,
    default: () => new Map()
  }
}, { timestamps: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
