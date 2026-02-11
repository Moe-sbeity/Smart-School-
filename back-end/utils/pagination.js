/**
 * Pagination utility for MongoDB queries
 * 
 * Usage:
 *   const { paginate, getPaginationParams } = require('./utils/pagination');
 *   
 *   // In controller:
 *   const { page, limit, skip } = getPaginationParams(req.query);
 *   const result = await paginate(Model, filter, { page, limit, sort, populate });
 */

/**
 * Extract pagination parameters from query string
 * @param {Object} query - req.query object
 * @param {Object} defaults - default values
 * @returns {Object} { page, limit, skip }
 */
export const getPaginationParams = (query, defaults = {}) => {
  const page = Math.max(1, parseInt(query.page) || defaults.page || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Paginate a MongoDB query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Pagination options
 * @returns {Object} { data, pagination }
 */
export const paginate = async (model, filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    populate = null,
    select = null,
    lean = true
  } = options;

  const skip = (page - 1) * limit;

  // Get total count
  const totalItems = await model.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / limit);

  // Build query
  let query = model.find(filter);
  
  if (select) {
    query = query.select(select);
  }
  
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(p => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(populate);
    }
  }
  
  query = query.sort(sort).skip(skip).limit(limit);
  
  if (lean) {
    query = query.lean();
  }

  const data = await query;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

/**
 * Apply pagination to an already-executed array of data
 * Useful when you need to process data before pagination
 * @param {Array} data - Array of data
 * @param {Object} options - { page, limit }
 * @returns {Object} { data, pagination }
 */
export const paginateArray = (data, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  const paginatedData = data.slice(skip, skip + limit);

  return {
    data: paginatedData,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

export default { getPaginationParams, paginate, paginateArray };
