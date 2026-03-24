# Parking Lot System

## Problem 1: Parking Lot System **[SR]**

### Requirements
- Multi-floor parking lot with different spot sizes (small, medium, large)
- Support vehicle types: motorcycle, car, truck
- Assign the nearest available spot of appropriate size
- Track entry/exit time and calculate parking fee
- Multiple entry/exit points
- Different pricing strategies (hourly, daily, flat rate)

### Key Design Patterns
- **Strategy Pattern**: for pricing calculation (swap algorithms at runtime)
- **Factory Pattern**: for creating vehicles and parking spots
- **Singleton Pattern**: for the ParkingLot instance (one lot)

### Class Diagram

```
+-------------------+       +-------------------+
|   ParkingLot      |       |   ParkingFloor    |
|-------------------|       |-------------------|
| - floors[]        |1----*>| - floorNumber     |
| - entryPanels[]   |       | - spots[]         |
| - exitPanels[]    |       |-------------------|
|-------------------|       | + getAvailableSpot()|
| + getAvailableSpot()|     +-------------------+
| + parkVehicle()   |              |
| + unparkVehicle() |              | 1
+-------------------+              |
                                   | *
+-------------------+       +-------------------+
|   Vehicle         |       |   ParkingSpot     |
|-------------------|       |-------------------|
| - licensePlate    |       | - id              |
| - type            |       | - size            |
| - size            |       | - isOccupied      |
|-------------------|       | - vehicle?        |
| (interface)       |       |-------------------|
+-------------------+       | + assign(vehicle) |
       ^                    | + release()       |
       |                    +-------------------+
  +---------+
  |Car|Truck|Motorcycle|

+-------------------+       +-------------------+
|   ParkingTicket   |       |<<interface>>      |
|-------------------|       |PricingStrategy    |
| - ticketId        |       |-------------------|
| - vehicle         |       | + calculate(      |
| - spot            |       |     entryTime,    |
| - entryTime       |       |     exitTime): num|
| - exitTime?       |       +-------------------+
| - amount?         |              ^
|-------------------|         +---------+----------+
| + calculateFee()  |         |         |          |
+-------------------+    Hourly    Daily    FlatRate
                         Pricing   Pricing  Pricing
```

### Code Implementation

```typescript
// ============================================================
// Types and Enums
// ============================================================

enum VehicleSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

enum VehicleType {
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  TRUCK = "TRUCK",
}

enum SpotSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

// ============================================================
// Vehicle (Interface + Implementations)
// ============================================================

interface IVehicle {
  licensePlate: string;
  type: VehicleType;
  size: VehicleSize;
}

class Motorcycle implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.MOTORCYCLE;
  size = VehicleSize.SMALL;
}

class Car implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.CAR;
  size = VehicleSize.MEDIUM;
}

class Truck implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.TRUCK;
  size = VehicleSize.LARGE;
}

// ============================================================
// Vehicle Factory
// ============================================================

class VehicleFactory {
  static create(type: VehicleType, licensePlate: string): IVehicle {
    switch (type) {
      case VehicleType.MOTORCYCLE:
        return new Motorcycle(licensePlate);
      case VehicleType.CAR:
        return new Car(licensePlate);
      case VehicleType.TRUCK:
        return new Truck(licensePlate);
      default:
        throw new Error(`Unknown vehicle type: ${type}`);
    }
  }
}

// ============================================================
// Parking Spot
// ============================================================

class ParkingSpot {
  private _vehicle: IVehicle | null = null;

  constructor(
    public readonly id: string,
    public readonly size: SpotSize,
    public readonly floorNumber: number
  ) {}

  get isOccupied(): boolean {
    return this._vehicle !== null;
  }

  get vehicle(): IVehicle | null {
    return this._vehicle;
  }

  canFit(vehicleSize: VehicleSize): boolean {
    const sizeOrder: Record<string, number> = {
      SMALL: 1,
      MEDIUM: 2,
      LARGE: 3,
    };
    return sizeOrder[this.size] >= sizeOrder[vehicleSize];
  }

  assign(vehicle: IVehicle): void {
    if (this._vehicle) {
      throw new Error(`Spot ${this.id} is already occupied`);
    }
    this._vehicle = vehicle;
  }

  release(): IVehicle | null {
    const vehicle = this._vehicle;
    this._vehicle = null;
    return vehicle;
  }
}

// ============================================================
// Pricing Strategy (Strategy Pattern)
// ============================================================

interface IPricingStrategy {
  calculate(entryTime: Date, exitTime: Date): number;
}

class HourlyPricing implements IPricingStrategy {
  constructor(private ratePerHour: number) {}

  calculate(entryTime: Date, exitTime: Date): number {
    const hours = Math.ceil(
      (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
    );
    return hours * this.ratePerHour;
  }
}

class DailyPricing implements IPricingStrategy {
  constructor(private ratePerDay: number) {}

  calculate(entryTime: Date, exitTime: Date): number {
    const days = Math.ceil(
      (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days * this.ratePerDay;
  }
}

class FlatRatePricing implements IPricingStrategy {
  constructor(private flatRate: number) {}

  calculate(_entryTime: Date, _exitTime: Date): number {
    return this.flatRate;
  }
}

// ============================================================
// Parking Ticket
// ============================================================

class ParkingTicket {
  public exitTime: Date | null = null;
  public amount: number | null = null;

  constructor(
    public readonly ticketId: string,
    public readonly vehicle: IVehicle,
    public readonly spot: ParkingSpot,
    public readonly entryTime: Date,
    private pricingStrategy: IPricingStrategy
  ) {}

  calculateFee(exitTime: Date): number {
    this.exitTime = exitTime;
    this.amount = this.pricingStrategy.calculate(this.entryTime, exitTime);
    return this.amount;
  }
}

// ============================================================
// Parking Floor
// ============================================================

class ParkingFloor {
  private spots: ParkingSpot[] = [];

  constructor(public readonly floorNumber: number) {}

  addSpot(spot: ParkingSpot): void {
    this.spots.push(spot);
  }

  getAvailableSpot(vehicleSize: VehicleSize): ParkingSpot | null {
    for (const spot of this.spots) {
      if (!spot.isOccupied && spot.canFit(vehicleSize)) {
        return spot;
      }
    }
    return null;
  }

  get availableSpotCount(): number {
    return this.spots.filter((s) => !s.isOccupied).length;
  }

  get totalSpotCount(): number {
    return this.spots.length;
  }
}

// ============================================================
// Parking Lot (Singleton)
// ============================================================

class ParkingLot {
  private static instance: ParkingLot;
  private floors: ParkingFloor[] = [];
  private activeTickets: Map<string, ParkingTicket> = new Map(); // licensePlate -> ticket
  private pricingStrategy: IPricingStrategy;
  private ticketCounter = 0;

  private constructor(pricingStrategy: IPricingStrategy) {
    this.pricingStrategy = pricingStrategy;
  }

  static getInstance(pricingStrategy?: IPricingStrategy): ParkingLot {
    if (!ParkingLot.instance) {
      if (!pricingStrategy) {
        throw new Error("Pricing strategy required for first initialization");
      }
      ParkingLot.instance = new ParkingLot(pricingStrategy);
    }
    return ParkingLot.instance;
  }

  // For testing: reset the singleton
  static resetInstance(): void {
    ParkingLot.instance = null as unknown as ParkingLot;
  }

  setPricingStrategy(strategy: IPricingStrategy): void {
    this.pricingStrategy = strategy;
  }

  addFloor(floor: ParkingFloor): void {
    this.floors.push(floor);
  }

  parkVehicle(vehicle: IVehicle): ParkingTicket {
    if (this.activeTickets.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle ${vehicle.licensePlate} is already parked`);
    }

    for (const floor of this.floors) {
      const spot = floor.getAvailableSpot(vehicle.size);
      if (spot) {
        spot.assign(vehicle);
        const ticket = new ParkingTicket(
          `T-${++this.ticketCounter}`,
          vehicle,
          spot,
          new Date(),
          this.pricingStrategy
        );
        this.activeTickets.set(vehicle.licensePlate, ticket);
        return ticket;
      }
    }

    throw new Error("No available spot for this vehicle");
  }

  unparkVehicle(licensePlate: string): ParkingTicket {
    const ticket = this.activeTickets.get(licensePlate);
    if (!ticket) {
      throw new Error(`No active ticket for vehicle ${licensePlate}`);
    }

    ticket.calculateFee(new Date());
    ticket.spot.release();
    this.activeTickets.delete(licensePlate);
    return ticket;
  }

  getAvailability(): { floor: number; available: number; total: number }[] {
    return this.floors.map((f) => ({
      floor: f.floorNumber,
      available: f.availableSpotCount,
      total: f.totalSpotCount,
    }));
  }
}

// ============================================================
// Example Usage
// ============================================================

ParkingLot.resetInstance();
const lot = ParkingLot.getInstance(new HourlyPricing(5)); // $5/hour

// Add floors with spots
const floor1 = new ParkingFloor(1);
floor1.addSpot(new ParkingSpot("1-S1", SpotSize.SMALL, 1));
floor1.addSpot(new ParkingSpot("1-M1", SpotSize.MEDIUM, 1));
floor1.addSpot(new ParkingSpot("1-M2", SpotSize.MEDIUM, 1));
floor1.addSpot(new ParkingSpot("1-L1", SpotSize.LARGE, 1));
lot.addFloor(floor1);

// Park vehicles
const car = VehicleFactory.create(VehicleType.CAR, "ABC-123");
const ticket = lot.parkVehicle(car);
console.log(`Parked ${car.licensePlate} at spot ${ticket.spot.id}`);

console.log("Availability:", lot.getAvailability());

// Unpark and pay
const completedTicket = lot.unparkVehicle("ABC-123");
console.log(`Fee: $${completedTicket.amount}`);

// Switch pricing strategy at runtime
lot.setPricingStrategy(new DailyPricing(20)); // $20/day
```

### SOLID Principles Applied
- **S (Single Responsibility)**: Each class has one job -- ParkingSpot manages spot state, PricingStrategy handles pricing, ParkingFloor manages a collection of spots.
- **O (Open/Closed)**: New pricing strategies can be added without modifying existing code. Just implement IPricingStrategy.
- **L (Liskov Substitution)**: Any vehicle subclass (Car, Truck, Motorcycle) can be used wherever IVehicle is expected.
- **I (Interface Segregation)**: IPricingStrategy has a single method. IVehicle has only the properties needed.
- **D (Dependency Inversion)**: ParkingTicket depends on IPricingStrategy (abstraction), not HourlyPricing (concrete).

### Extension Points
- **New vehicle types**: implement IVehicle, add to VehicleFactory
- **New pricing models**: implement IPricingStrategy (e.g., weekend pricing, first-hour-free)
- **Electric vehicle spots**: subclass ParkingSpot with a hasCharger property
- **Reservation system**: add a ReservationService that pre-assigns spots
- **Multiple entry/exit points**: add EntryPanel and ExitPanel classes that delegate to ParkingLot
