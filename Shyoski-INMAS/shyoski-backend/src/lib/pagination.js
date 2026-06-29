// src/lib/pagination.js
import { ObjectId } from 'mongodb'

/**
 * Standardized pagination helper.
 * Supports offset-based (page/limit) and cursor-based (_id filtering) pagination.
 * 
 * @param {import('mongodb').Collection} collection The MongoDB collection instance
 * @param {object} query The base match query
 * @param {object} options Pagination options
 * @param {number|string} [options.page] Page number (for offset)
 * @param {number|string} [options.limit] Maximum records to return
 * @param {object} [options.sort] Sorting configuration (for offset)
 * @param {object} [options.projection] Projection options
 * @param {string} [options.cursor] Last seen ObjectId string (for cursor pagination)
 */
export async function paginateCollection(collection, query, options = {}) {
  const page = Math.max(1, parseInt(options.page || 1))
  const limit = Math.min(Math.max(1, parseInt(options.limit || 20)), 100)
  
  const finalQuery = { ...query }
  let items = []
  let nextCursor = null

  // Calculate total documents matching the base query (without cursor filter)
  const total = await collection.countDocuments(query)
  const pages = Math.ceil(total / limit)

  if (options.cursor) {
    // Cursor pagination uses _id for O(1) performance
    try {
      finalQuery._id = { $lt: new ObjectId(options.cursor.toString()) }
    } catch (err) {
      // If cursor is invalid, fall back to base query
    }
    
    // Cursor sort is strictly by _id descending
    items = await collection
      .find(finalQuery)
      .sort({ _id: -1 })
      .project(options.projection || {})
      .limit(limit)
      .toArray()

    if (items.length === limit) {
      const lastItem = items[items.length - 1]
      nextCursor = lastItem._id.toString()
    }
  } else {
    // Offset-based pagination
    const skip = (page - 1) * limit
    const sort = options.sort || { createdAt: -1 }

    items = await collection
      .find(finalQuery)
      .sort(sort)
      .project(options.projection || {})
      .skip(skip)
      .limit(limit)
      .toArray()

    if (items.length > 0 && page * limit < total) {
      const lastItem = items[items.length - 1]
      nextCursor = lastItem._id.toString()
    }
  }

  return {
    data: items,
    pagination: {
      page: options.cursor ? null : page,
      limit,
      total,
      pages: options.cursor ? null : pages,
      nextCursor
    }
  }
}
