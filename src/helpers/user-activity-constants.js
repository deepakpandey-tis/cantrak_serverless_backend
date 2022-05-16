
const EntityTypes = {
    Company: 1,
    GrowingLocation: 2,
    SubGrowingLocation: 3,
    ContainerType: 4,
    Store: 5,
    UoM: 6,
    Item: 7,
    Specie: 8,
    Strain: 9,
    GrowthStage: 10,
    Process: 11,
    Supplier: 12,
    Customer: 13,
    License: 14,
    LicenseNar: 15,
    RawMaterial: 16,
    Product: 17,
    WasteMaterial: 18,
    FinishedGood: 19,
    Plant: 20,
    PlantChangeGrowthStage: 21,
    PlantChangeLocation: 22,
    PlantWaste: 23,
    Harvest: 24,
    Production: 25,
    Invoice: 26,
  };

  const EntityActions = {
    Add: 1,
    View: 2,
    Edit: 3,
    ToggleStatus: 4,
    Delete: 5,
    Print: 6,
    Import: 7,
  };

module.exports = {EntityTypes, EntityActions};
