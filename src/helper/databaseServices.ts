import redisClient from "../database/redis";

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

export const findAllAndPopulateWithSorting = async (modelName, criteria, projection, options, populateModel) => {
  options.lean = true;
  return await modelName.find(criteria, projection, options).collation({ locale: "en" }).populate(populateModel);
};

// ================ All Create Services ================

export const createOne = async (modelName, objToSave) => {
  return new modelName(objToSave).save();
};

export const createMany = async (modelName, objToSave) => {
  return await modelName.insertMany(objToSave);
};

// ================ All Create Services ================

export const updateData = async (modelName, criteria, dataToSet, options) => {
  options.returnDocument = "after";
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

// ================ Redis Services ================

export const redisGet = async (key: string): Promise<any | null> => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data as string);
    }
    return null;
  } catch (error) {
    console.error(`Error in redisGet for key ${key}:`, error);
    return null;
  }
};

export const redisSet = async (key: string, value: any, expiryInSeconds: number = 3600): Promise<void> => {
  try {
    const stringValue = JSON.stringify(value);
    await redisClient.set(key, stringValue, {
      EX: expiryInSeconds,
    });
  } catch (error) {
    console.error(`Error in redisSet for key ${key}:`, error);
  }
};

export const redisDel = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`Error in redisDel for key ${key}:`, error);
  }
};

export const redisdelPattern = async (pattern: string): Promise<void> => {
  try {
    const keys: string[] = [];

    for await (const keyOrKeys of redisClient.scanIterator({ MATCH: pattern, COUNT: 100, })) {
      const matchedKeys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      keys.push(...matchedKeys);

      if (keys.length >= 100) {
        await redisClient.del(keys);
        keys.length = 0;
      }
    }
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`Error in redisdelPattern for pattern ${pattern}:`, error);
  }
};
