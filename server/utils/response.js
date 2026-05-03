export const success = (res, data, message = '成功') => {
  return res.json({
    success: true,
    data,
    message
  });
};

export const error = (res, message, status = 500, code = 'ERROR') => {
  return res.status(status).json({
    success: false,
    error: message,
    code
  });
};

export const paginated = (res, data, total, page, pageSize) => {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
};

export const created = (res, data, message = '创建成功') => {
  return res.status(201).json({
    success: true,
    data,
    message
  });
};

export const noContent = (res) => {
  return res.status(204).send();
};
