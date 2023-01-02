
const CustomerTypes = {
    IndividualLocal: 11,
    IndividualForeigner: 12,
    CorporateLocal: 21,
    CorporateForeigner: 22,
    Government: 31,
};

const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4,
    PackingLoss: 5
};

const BatchTypes ={
    Production: 1,
    Harvest: 2,
    Plants: 3,
    RawMaterial: 4,
};

const TxnTypes = {
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveWaste: 23,                          // Inventory option
    ReceiveFromProduction: 24,
    ReceiveFromSaleCancelled: 25,
    ReceiveFromPacking: 26,
    AdjustmentAdd: 41,
    PackingLoss: 42,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueForProduction: 54,
    IssueForSale: 55,
    IssueForPacking: 56,
    AdjustmentMinus: 81,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const SystemStores = {
    PackingLoss: 99991001
};

const ObservationTypes ={
    Unhealthy: 1,
    Healthy: 2,
};

module.exports = { CustomerTypes, ItemCategory, BatchTypes, TxnTypes, SystemStores, ObservationTypes };
