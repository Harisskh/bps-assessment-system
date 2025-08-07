const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { validateUserData } = require('../utils/validators');

class UserService {
  /**
   * Get all users with pagination
   */
  static async getAllUsers(page = 1, limit = 10, search = '', role = '') {
    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };
    
    if (search) {
      whereClause[Op.or] = [
        { nama: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { nip: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereClause.role = role;
    }
    
    const { rows: users, count: total } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['nama', 'ASC']],
      attributes: { exclude: ['password'] }
    });
    
    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get user by ID
   */
  static async getUserById(id) {
    return await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
  }
  
  /**
   * Get user by username or NIP
   */
  static async getUserByIdentifier(identifier) {
    return await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { nip: identifier }
        ]
      }
    });
  }
  
  /**
   * Create new user
   */
  static async createUser(userData) {
    const validation = await validateUserData(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password || 'bps1810', 10);
    
    const user = await User.create({
      ...userData,
      password: hashedPassword,
      primaryRole: userData.role || 'STAFF',
      roles: userData.roles || [userData.role || 'STAFF']
    });
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }
  
  /**
   * Update user
   */
  static async updateUser(id, userData) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const validation = await validateUserData(userData, true, id);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // If password is provided, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    await user.update(userData);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }
  
  /**
   * Soft delete user
   */
  static async deleteUser(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    await user.update({ isActive: false });
    return { message: 'User deleted successfully' };
  }
  
  /**
   * Change user password
   */
  static async changePassword(id, currentPassword, newPassword) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedNewPassword });
    
    return { message: 'Password changed successfully' };
  }
  
  /**
   * Get users for evaluation (excluding self)
   */
  static async getUsersForEvaluation(excludeUserId) {
    return await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: excludeUserId }
      },
      attributes: ['id', 'nama', 'nip', 'jabatan'],
      order: [['nama', 'ASC']]
    });
  }
}

module.exports = UserService;