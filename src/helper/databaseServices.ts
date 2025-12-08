// ================ All Find Services ================

export const deleteSingleRecord = async (modelName, criteria, projection, options) => {
  options.lean = true;
  return modelName.deleteOne(criteria, projection, options);
};

export const getData = async (modelName, criteria, projection, options) => {
  options.lean = true;
  return modelName.find(criteria, projection, options);
};

export const getFirstMatch = async (modelName, criteria, projection, options) => {
  options.lean = true;
  return await modelName.findOne(criteria, projection, options);
};

export const getDataWithSorting = async (modelName, criteria, projection, options) => {
  options.lean = true;
  return await modelName.find(criteria, projection, options).collation({ locale: "en" });
};

export const findOneAndPopulate = async (modelName, criteria, projection, options, populateModel) => {
  options.lean = true;
  return await modelName.findOne(criteria, projection, options).populate(populateModel).exec();
};

export const findAllAndPopulate = async (modelName, criteria, projection, options, populateModel) => {
  options.lean = true;
  return await modelName.find(criteria, projection, options).populate(populateModel);
};

export const findALlAndPopulateWithSorting = async (modelName, criteria, projection, options, populateModel) => {
  options.lean = true;
  return await modelName.find(criteria, projection, options).collation({ locale: "en" }).populate(populateModel);
};

// ================ All Create Services ================

export const createOne = async (modelName, objToSave) => {
  return new modelName(objToSave).save();
};

export const createMany = async (modelName, objToSave) => {
  return new modelName.insertMany(objToSave);
};

// ================ All Create Services ================

export const updateData = async (modelName, criteria, dataToSet, options) => {
  options.new = true;
  options.lean = true;
  return await modelName.findOneAndUpdate(criteria, dataToSet, options);
};

export const updateMany = async (modelName, criteria, dataToSet, options) => {
  return modelName.updateMany(criteria, dataToSet, options);
};

// ================ Count Data Services ================
export const countData = async (modelName, criteria) => {
  return modelName.countDocuments(criteria);
};

// ================ All Aggregate Services ================

export const aggregateData = async (modelName, criteria) => {
  return modelName.aggregate(criteria);
};

export const aggregateDataWithSorting = async (modelName, criteria) => {
  return modelName.aggregate(criteria).collation({ locale: "en" });
};

export const aggregateAndPopulate = async (modelName, criteria, populateModel) => {
  const result = await modelName.aggregate(criteria);
  return modelName.populate(result, populateModel);
};
