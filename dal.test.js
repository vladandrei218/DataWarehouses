const mockCollection = {
    find: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    insertOne: jest.fn(),
    aggregate: jest.fn().mockReturnThis() 
};

const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection)
};

const mockClientInstance = {
    connect: jest.fn().mockResolvedValue(true),
    db: jest.fn().mockReturnValue(mockDb)
};

jest.mock('mongodb', () => {
    return {
        MongoClient: jest.fn(() => mockClientInstance)
    };
});

const dal = require('./dal');

describe('Data Access Layer (DAL) Tests', () => {
    
    beforeAll(async () => {
        await dal.connectDB();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getActiveAssets should apply pagination correctly', async () => {
        const mockData = [{ instrumentId: 'AAPL' }, { instrumentId: 'TSLA' }];
        mockCollection.toArray.mockResolvedValue(mockData);

        const page = 2;
        const limit = 10;
        const result = await dal.getActiveAssets(page, limit);

        expect(mockCollection.find).toHaveBeenCalledWith(
            { validTo: null, isDeleted: false },
            expect.any(Object)
        );
        expect(mockCollection.skip).toHaveBeenCalledWith(10);
        expect(mockCollection.limit).toHaveBeenCalledWith(10);
        expect(result).toEqual(mockData);
    });
    test('historicallyUpdateAsset should close old record and insert new one', async () => {
        const fakeCurrentAsset = { 
            _id: '123', 
            instrumentId: 'AAPL', 
            name: 'Apple', 
            attributes: { CEO: 'Tim Cook' } 
        };
        
        mockCollection.findOne.mockResolvedValue(fakeCurrentAsset);
        mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
        mockCollection.insertOne.mockResolvedValue({ insertedId: '456' });

        const updates = { attributes: { CEO: 'New CEO' } };
        const result = await dal.historicallyUpdateAsset('AAPL', updates);

        expect(mockCollection.updateOne).toHaveBeenCalledWith(
            { _id: '123' },
            { $set: { validTo: expect.any(Date) } }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
            expect.objectContaining({
                instrumentId: 'AAPL',
                attributes: { CEO: 'New CEO' },
                validTo: null,
                isDeleted: false
            })
        );

        expect(result.instrumentId).toBe('AAPL');
        expect(result.attributes.CEO).toBe('New CEO');
    });
    test('historicallyDeleteAsset should mark record as isDeleted: true', async () => {
        const fakeCurrentAsset = { 
            _id: '789', 
            instrumentId: 'TSLA', 
            isDeleted: false 
        };
        
        mockCollection.findOne.mockResolvedValue(fakeCurrentAsset);
        mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
        mockCollection.insertOne.mockResolvedValue({ insertedId: '012' });

        await dal.historicallyDeleteAsset('TSLA');

        expect(mockCollection.updateOne).toHaveBeenCalledWith(
            { _id: '789' },
            { $set: { validTo: expect.any(Date) } }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
            expect.objectContaining({
                instrumentId: 'TSLA',
                validTo: null,
                isDeleted: true
            })
        );
    });

    test('historicallyUpdateAsset should throw error if asset not found', async () => {
        mockCollection.findOne.mockResolvedValue(null);

        await expect(dal.historicallyUpdateAsset('UNKNOWN', {}))
            .rejects
            .toThrow("Asset not found or inactive.");
    });
});