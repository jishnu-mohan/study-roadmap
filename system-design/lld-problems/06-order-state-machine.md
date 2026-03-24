# State Machine for Order Processing

## Problem 6: State Machine for Order Processing **[SR]**

### Requirements
- Define states and valid transitions for an order lifecycle
- Validate transitions (reject invalid state changes)
- Execute actions on state entry/exit
- Emit events on state transitions
- Support guards (conditions that must be true for a transition to occur)

### Key Design Patterns
- **State Pattern**: each state is an object that defines its behavior and valid transitions
- **Observer Pattern**: emit events on state transitions for other systems to react

### Class Diagram

```
+-------------------+        +-------------------+
| StateMachine      |        |<<interface>>      |
|-------------------|        | IState            |
| - currentState    |        |-------------------|
| - states: Map     |        | + name: string    |
| - context         |        | + onEnter(ctx)    |
| - listeners[]     |        | + onExit(ctx)     |
|-------------------|        | + getTransitions()|
| + transition(evt) |        +-------------------+
| + getState()      |              ^
| + canTransition() |              |
+-------------------+    +--------+---------+
                         |        |         |
                      Placed   Paid    Shipped  ...

+-------------------+
| Transition        |
|-------------------|
| - event: string   |
| - targetState     |
| - guard?: fn      |
| - action?: fn     |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Types
// ============================================================

interface OrderContext {
  orderId: string;
  items: Array<{ sku: string; quantity: number; priceCents: number }>;
  totalCents: number;
  paymentId: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  history: Array<{ from: string; to: string; event: string; at: Date }>;
}

type GuardFn = (context: OrderContext) => boolean;
type ActionFn = (context: OrderContext) => void | Promise<void>;

interface TransitionConfig {
  event: string;
  target: string;
  guard?: GuardFn;
  action?: ActionFn;
}

// ============================================================
// State Interface and Implementations
// ============================================================

interface IState {
  readonly name: string;
  onEnter(context: OrderContext): void | Promise<void>;
  onExit(context: OrderContext): void | Promise<void>;
  getTransitions(): TransitionConfig[];
}

class PlacedState implements IState {
  readonly name = "PLACED";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Order ${context.orderId} has been placed`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "PAYMENT_RECEIVED",
        target: "PAID",
        guard: (ctx) => ctx.totalCents > 0,
        action: (ctx) => {
          ctx.paymentId = `pay_${Date.now()}`;
        },
      },
      {
        event: "CANCEL",
        target: "CANCELLED",
        action: (ctx) => {
          ctx.cancelReason = ctx.cancelReason ?? "Cancelled by customer before payment";
        },
      },
    ];
  }
}

class PaidState implements IState {
  readonly name = "PAID";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Payment ${context.paymentId} confirmed for order ${context.orderId}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "SHIP",
        target: "SHIPPED",
        guard: (ctx) => ctx.items.length > 0,
        action: (ctx) => {
          ctx.trackingNumber = `TRK${Date.now()}`;
        },
      },
      {
        event: "CANCEL",
        target: "REFUND_PENDING",
        action: (ctx) => {
          ctx.cancelReason = ctx.cancelReason ?? "Cancelled after payment";
        },
      },
    ];
  }
}

class ShippedState implements IState {
  readonly name = "SHIPPED";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Order ${context.orderId} shipped with tracking ${context.trackingNumber}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "DELIVER",
        target: "DELIVERED",
      },
      {
        event: "RETURN_REQUESTED",
        target: "RETURN_PENDING",
      },
    ];
  }
}

class DeliveredState implements IState {
  readonly name = "DELIVERED";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Order ${context.orderId} has been delivered`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "RETURN_REQUESTED",
        target: "RETURN_PENDING",
      },
    ];
  }
}

class CancelledState implements IState {
  readonly name = "CANCELLED";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Order ${context.orderId} cancelled: ${context.cancelReason}`
    );
  }

  onExit(_context: OrderContext): void {
    // Terminal state -- should not exit
  }

  getTransitions(): TransitionConfig[] {
    return []; // Terminal state, no transitions out
  }
}

class RefundPendingState implements IState {
  readonly name = "REFUND_PENDING";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Refund initiated for order ${context.orderId}, payment ${context.paymentId}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "REFUND_COMPLETED",
        target: "CANCELLED",
        action: (ctx) => {
          ctx.cancelReason =
            (ctx.cancelReason ?? "Cancelled") + " -- refund completed";
        },
      },
    ];
  }
}

class ReturnPendingState implements IState {
  readonly name = "RETURN_PENDING";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Return requested for order ${context.orderId}`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "RETURN_RECEIVED",
        target: "REFUND_PENDING",
      },
      {
        event: "RETURN_REJECTED",
        target: "DELIVERED",
      },
    ];
  }
}

// ============================================================
// Transition Event Listener (Observer Pattern)
// ============================================================

interface TransitionEvent {
  from: string;
  to: string;
  event: string;
  context: OrderContext;
  timestamp: Date;
}

interface ITransitionListener {
  onTransition(event: TransitionEvent): void;
}

// ============================================================
// State Machine
// ============================================================

class OrderStateMachine {
  private states: Map<string, IState> = new Map();
  private currentState: IState;
  private context: OrderContext;
  private listeners: ITransitionListener[] = [];

  constructor(initialState: IState, context: OrderContext) {
    this.currentState = initialState;
    this.context = context;
    this.registerState(initialState);
  }

  registerState(state: IState): void {
    this.states.set(state.name, state);
  }

  registerStates(states: IState[]): void {
    states.forEach((s) => this.registerState(s));
  }

  addListener(listener: ITransitionListener): void {
    this.listeners.push(listener);
  }

  getStateName(): string {
    return this.currentState.name;
  }

  getContext(): Readonly<OrderContext> {
    return this.context;
  }

  canTransition(event: string): boolean {
    const transition = this.findTransition(event);
    if (!transition) return false;
    if (transition.guard && !transition.guard(this.context)) return false;
    return true;
  }

  getAvailableEvents(): string[] {
    return this.currentState
      .getTransitions()
      .filter((t) => !t.guard || t.guard(this.context))
      .map((t) => t.event);
  }

  async transition(event: string): Promise<void> {
    const transitionConfig = this.findTransition(event);

    if (!transitionConfig) {
      throw new Error(
        `Invalid transition: event "${event}" is not valid from state "${this.currentState.name}". ` +
        `Available events: [${this.getAvailableEvents().join(", ")}]`
      );
    }

    // Check guard
    if (transitionConfig.guard && !transitionConfig.guard(this.context)) {
      throw new Error(
        `Guard condition failed for transition "${event}" from state "${this.currentState.name}"`
      );
    }

    const targetState = this.states.get(transitionConfig.target);
    if (!targetState) {
      throw new Error(`Target state "${transitionConfig.target}" is not registered`);
    }

    const fromName = this.currentState.name;

    // Exit current state
    await this.currentState.onExit(this.context);

    // Execute transition action
    if (transitionConfig.action) {
      await transitionConfig.action(this.context);
    }

    // Enter new state
    this.currentState = targetState;
    await this.currentState.onEnter(this.context);

    // Record in history
    this.context.history.push({
      from: fromName,
      to: this.currentState.name,
      event,
      at: new Date(),
    });

    // Notify listeners
    const transitionEvent: TransitionEvent = {
      from: fromName,
      to: this.currentState.name,
      event,
      context: this.context,
      timestamp: new Date(),
    };

    for (const listener of this.listeners) {
      listener.onTransition(transitionEvent);
    }
  }

  private findTransition(event: string): TransitionConfig | undefined {
    return this.currentState
      .getTransitions()
      .find((t) => t.event === event);
  }
}

// ============================================================
// Example: Event Logger Listener
// ============================================================

class EventLoggerListener implements ITransitionListener {
  onTransition(event: TransitionEvent): void {
    console.log(
      `  [EVENT] ${event.from} -> ${event.to} (trigger: ${event.event})`
    );
  }
}

class EventBridgePublisher implements ITransitionListener {
  onTransition(event: TransitionEvent): void {
    // In production: publish to EventBridge
    console.log(
      `  [EventBridge] Published: order.${event.event.toLowerCase()} ` +
      `for order ${event.context.orderId}`
    );
  }
}

// ============================================================
// Example Usage
// ============================================================

async function runOrderExample() {
  // Create order context
  const context: OrderContext = {
    orderId: "ORD-001",
    items: [
      { sku: "WIDGET-A", quantity: 2, priceCents: 1500 },
      { sku: "GADGET-B", quantity: 1, priceCents: 3000 },
    ],
    totalCents: 6000,
    paymentId: null,
    trackingNumber: null,
    cancelReason: null,
    history: [],
  };

  // Create state machine
  const placed = new PlacedState();
  const sm = new OrderStateMachine(placed, context);

  // Register all states
  sm.registerStates([
    new PaidState(),
    new ShippedState(),
    new DeliveredState(),
    new CancelledState(),
    new RefundPendingState(),
    new ReturnPendingState(),
  ]);

  // Add listeners
  sm.addListener(new EventLoggerListener());
  sm.addListener(new EventBridgePublisher());

  // Enter initial state
  console.log("=== Order Processing ===");
  console.log(`Current state: ${sm.getStateName()}`);
  console.log(`Available events: ${sm.getAvailableEvents().join(", ")}`);

  // Process the order through its lifecycle
  await sm.transition("PAYMENT_RECEIVED");
  console.log(`Current state: ${sm.getStateName()}`);

  await sm.transition("SHIP");
  console.log(`Current state: ${sm.getStateName()}`);

  await sm.transition("DELIVER");
  console.log(`Current state: ${sm.getStateName()}`);

  // Try invalid transition
  try {
    await sm.transition("SHIP"); // Cannot ship a delivered order
  } catch (err) {
    console.log(`Expected error: ${(err as Error).message}`);
  }

  // Print history
  console.log("\n=== Order History ===");
  for (const entry of context.history) {
    console.log(`  ${entry.from} -> ${entry.to} via ${entry.event} at ${entry.at.toISOString()}`);
  }
}

runOrderExample();
```

### SOLID Principles Applied
- **S**: Each state class defines only its own behavior and transitions. The state machine handles orchestration. Listeners handle side effects.
- **O**: New states (e.g., PartiallyShippedState) are added by creating a new class and registering it. No existing state code changes.
- **L**: All IState implementations are interchangeable in the state machine.
- **I**: IState has focused methods (onEnter, onExit, getTransitions). ITransitionListener has one method.
- **D**: StateMachine depends on IState and ITransitionListener abstractions. Adding EventBridge publishing is just a new listener.

### Extension Points
- **Persistence**: serialize state machine context to DB, reload on service restart (critical for order processing)
- **Timeout transitions**: auto-transition if stuck in a state too long (e.g., PAYMENT_PENDING for > 30 min -> auto-cancel)
- **Parallel states**: support compound states where order can be in multiple sub-states (e.g., SHIPPED + PARTIALLY_REFUNDED)
- **State machine visualization**: generate DOT graph from state definitions for documentation
- **AWS Step Functions mapping**: each state maps directly to a Step Functions state, making this design portable to orchestrated workflows
