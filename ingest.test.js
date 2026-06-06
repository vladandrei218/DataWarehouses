const mockCollection = {
    createIndex: jest.fn().mockResolvedValue(true),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 })
};
const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
const mockClient = {
    connect: jest.fn().mockResolvedValue(),
    db: jest.fn().mockReturnValue(mockDb),
    close: jest.fn().mockResolvedValue()
};

jest.mock('mongodb', () => ({ MongoClient: jest.fn(() => mockClient) }));

const mockChart = jest.fn();
jest.mock('yahoo-finance2', () => ({
    default: jest.fn().mockImplementation(() => ({
        chart: mockChart
    }))
}));

jest.mock('./assets.js', () => [{
    symbol: 'AAPL',
    name: 'Apple Inc.',
    providerName: 'Yahoo Finance'
}]);

describe('Ingestion Script', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('should fetch and upsert valid quotes', async () => {
        mockChart.mockResolvedValue({
            quotes: [{ date: new Date('2026-06-01'), open: 150, close: 155, high: 160, low: 140, volume: 1000 }]
        });
        mockCollection.findOne.mockResolvedValue(null); 

        jest.isolateModules(() => {
            require('./ingest.js');
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockChart).toHaveBeenCalled();
        expect(mockCollection.insertOne).toHaveBeenCalled();
        expect(mockCollection.updateOne).toHaveBeenCalled(); 
        expect(mockClient.close).toHaveBeenCalled();
    });

    test('should skip quotes with missing data', async () => {
        mockChart.mockResolvedValue({
            quotes: [{ date: null, open: null, close: 155 }] 
        });

        jest.isolateModules(() => {
            require('./ingest.js');
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });
});