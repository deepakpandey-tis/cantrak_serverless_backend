
const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4,
    PackingLoss: 5
};

const TxnTypes = {
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveWaste: 23,                          // Inventory option
    ReceiveFromProduction: 24,
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

module.exports = { ItemCategory, TxnTypes, SystemStores };
