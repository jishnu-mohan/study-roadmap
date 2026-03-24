# Strategy Pattern Showcase -- Payment Processing

## Problem 7: Strategy Pattern Showcase -- Payment Processing **[SR]**

### Requirements
- Support multiple payment methods (credit card, PayPal, bank transfer, crypto)
- Each payment method has different processing logic, validation, and fee structure
- Add new payment methods without modifying existing code
- Handle payment lifecycle: authorize, capture, refund
- Fee calculation varies by payment method

### Key Design Patterns
- **Strategy Pattern**: each payment method is a strategy with its own processing logic
- **Factory Pattern**: create the right payment processor based on payment method type

### Class Diagram

```
+---------------------+       +------------------------+
| PaymentService      |       |<<interface>>           |
|---------------------|       | IPaymentProcessor      |
| - processors: Map   |       |------------------------|
| - factory           |       | + authorize(payment)   |
|---------------------|       | + capture(authId)      |
| + processPayment()  |       | + refund(paymentId)    |
| + refundPayment()   |       | + calculateFee(amount) |
| + getProcessor()    |       | + validate(details)    |
+---------------------+       +------------------------+
                                       ^
                           +-----------+-----------+-----------+
                           |           |           |           |
                    CreditCard    PayPal     BankTransfer   Crypto
                    Processor    Processor   Processor     Processor

+---------------------+
| PaymentProcessorFactory|
|---------------------|
| + create(type):     |
|   IPaymentProcessor |
+---------------------+

+---------------------+       +---------------------+
| Payment             |       | PaymentResult       |
|---------------------|       |---------------------|
| - id                |       | - success           |
| - amount            |       | - transactionId     |
| - currency          |       | - fee               |
| - method            |       | - message           |
| - status            |       +---------------------+
| - details           |
+---------------------+
```

### Code Implementation

```typescript
// ============================================================
// Types and Interfaces
// ============================================================

enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  PAYPAL = "PAYPAL",
  BANK_TRANSFER = "BANK_TRANSFER",
  CRYPTO = "CRYPTO",
}

enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

interface PaymentDetails {
  // Credit Card
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  // PayPal
  paypalEmail?: string;
  // Bank Transfer
  accountNumber?: string;
  routingNumber?: string;
  // Crypto
  walletAddress?: string;
  cryptoCurrency?: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  details: PaymentDetails;
  authorizationId: string | null;
  transactionId: string | null;
  feeCents: number;
  createdAt: Date;
}

interface PaymentResult {
  success: boolean;
  transactionId: string | null;
  authorizationId: string | null;
  feeCents: number;
  message: string;
}

// ============================================================
// Payment Processor Interface (Strategy)
// ============================================================

interface IPaymentProcessor {
  readonly methodName: string;
  validate(details: PaymentDetails): { valid: boolean; errors: string[] };
  authorize(payment: Payment): Promise<PaymentResult>;
  capture(authorizationId: string, amountCents: number): Promise<PaymentResult>;
  refund(transactionId: string, amountCents: number): Promise<PaymentResult>;
  calculateFeeCents(amountCents: number): number;
}

// ============================================================
// Credit Card Processor
// ============================================================

class CreditCardProcessor implements IPaymentProcessor {
  readonly methodName = "Credit Card";
  private feePercentage = 2.9;   // 2.9%
  private fixedFeeCents = 30;     // $0.30

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.cardNumber || details.cardNumber.length < 13) {
      errors.push("Invalid card number");
    }
    if (!details.cardExpiry || !/^\d{2}\/\d{2}$/.test(details.cardExpiry)) {
      errors.push("Invalid expiry date (MM/YY)");
    }
    if (!details.cardCvv || !/^\d{3,4}$/.test(details.cardCvv)) {
      errors.push("Invalid CVV");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    // Simulate credit card authorization via payment gateway
    console.log(
      `  [CreditCard] Authorizing $${(payment.amountCents / 100).toFixed(2)} ` +
      `on card ending ${payment.details.cardNumber?.slice(-4)}`
    );

    // Simulate network call
    const authId = `auth_cc_${Date.now()}`;
    const feeCents = this.calculateFeeCents(payment.amountCents);

    return {
      success: true,
      transactionId: null,
      authorizationId: authId,
      feeCents,
      message: `Authorized $${(payment.amountCents / 100).toFixed(2)} on credit card`,
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [CreditCard] Capturing $${(amountCents / 100).toFixed(2)} for auth ${authorizationId}`
    );

    return {
      success: true,
      transactionId: `txn_cc_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Payment captured",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [CreditCard] Refunding $${(amountCents / 100).toFixed(2)} for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_cc_${Date.now()}`,
      authorizationId: null,
      feeCents: 0, // refund processing fees vary by provider
      message: "Refund processed (5-10 business days)",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100)) + this.fixedFeeCents;
  }
}

// ============================================================
// PayPal Processor
// ============================================================

class PayPalProcessor implements IPaymentProcessor {
  readonly methodName = "PayPal";
  private feePercentage = 3.49;
  private fixedFeeCents = 49;

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.paypalEmail || !details.paypalEmail.includes("@")) {
      errors.push("Invalid PayPal email");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [PayPal] Creating payment for $${(payment.amountCents / 100).toFixed(2)} ` +
      `to ${payment.details.paypalEmail}`
    );

    return {
      success: true,
      transactionId: null,
      authorizationId: `auth_pp_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: "PayPal authorization created",
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [PayPal] Executing payment for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_pp_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "PayPal payment captured",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [PayPal] Refunding $${(amountCents / 100).toFixed(2)} for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_pp_${Date.now()}`,
      authorizationId: null,
      feeCents: 0,
      message: "PayPal refund processed (3-5 business days)",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100)) + this.fixedFeeCents;
  }
}

// ============================================================
// Bank Transfer Processor
// ============================================================

class BankTransferProcessor implements IPaymentProcessor {
  readonly methodName = "Bank Transfer (ACH)";
  private flatFeeCents = 25; // $0.25 flat

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.accountNumber || details.accountNumber.length < 8) {
      errors.push("Invalid account number");
    }
    if (!details.routingNumber || details.routingNumber.length !== 9) {
      errors.push("Routing number must be 9 digits");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [BankTransfer] Initiating ACH debit for $${(payment.amountCents / 100).toFixed(2)}`
    );

    // Bank transfers are typically capture-only (no separate auth step)
    // But we model it as auth for consistency
    return {
      success: true,
      transactionId: null,
      authorizationId: `auth_ach_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: "ACH transfer initiated (settles in 2-3 business days)",
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [BankTransfer] Confirming ACH for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_ach_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "ACH transfer confirmed",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [BankTransfer] Initiating ACH credit for $${(amountCents / 100).toFixed(2)}`
    );

    return {
      success: true,
      transactionId: `refund_ach_${Date.now()}`,
      authorizationId: null,
      feeCents: 0,
      message: "ACH refund initiated (5-7 business days)",
    };
  }

  calculateFeeCents(_amountCents: number): number {
    return this.flatFeeCents;
  }
}

// ============================================================
// Crypto Processor
// ============================================================

class CryptoProcessor implements IPaymentProcessor {
  readonly methodName = "Cryptocurrency";
  private feePercentage = 1.0;

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.walletAddress || details.walletAddress.length < 20) {
      errors.push("Invalid wallet address");
    }
    if (!details.cryptoCurrency) {
      errors.push("Cryptocurrency type is required");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [Crypto] Creating ${payment.details.cryptoCurrency} payment for ` +
      `$${(payment.amountCents / 100).toFixed(2)} to ${payment.details.walletAddress}`
    );

    // Crypto payments are typically immediate (no separate auth)
    return {
      success: true,
      transactionId: `txn_crypto_${Date.now()}`,
      authorizationId: `auth_crypto_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: `${payment.details.cryptoCurrency} payment pending confirmation`,
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [Crypto] Confirming blockchain transaction for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_crypto_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Blockchain confirmation received",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [Crypto] Initiating crypto refund of $${(amountCents / 100).toFixed(2)} ` +
      `for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_crypto_${Date.now()}`,
      authorizationId: null,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Crypto refund sent to wallet",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100));
  }
}

// ============================================================
// Payment Processor Factory
// ============================================================

class PaymentProcessorFactory {
  private static processors: Map<PaymentMethod, IPaymentProcessor> = new Map();

  static register(method: PaymentMethod, processor: IPaymentProcessor): void {
    PaymentProcessorFactory.processors.set(method, processor);
  }

  static create(method: PaymentMethod): IPaymentProcessor {
    const processor = PaymentProcessorFactory.processors.get(method);
    if (!processor) {
      throw new Error(`No processor registered for payment method: ${method}`);
    }
    return processor;
  }

  static getAvailableMethods(): PaymentMethod[] {
    return Array.from(PaymentProcessorFactory.processors.keys());
  }
}

// Register processors
PaymentProcessorFactory.register(PaymentMethod.CREDIT_CARD, new CreditCardProcessor());
PaymentProcessorFactory.register(PaymentMethod.PAYPAL, new PayPalProcessor());
PaymentProcessorFactory.register(PaymentMethod.BANK_TRANSFER, new BankTransferProcessor());
PaymentProcessorFactory.register(PaymentMethod.CRYPTO, new CryptoProcessor());

// ============================================================
// Payment Service (Facade)
// ============================================================

class PaymentService {
  private payments: Map<string, Payment> = new Map();

  async processPayment(
    method: PaymentMethod,
    amountCents: number,
    currency: string,
    details: PaymentDetails
  ): Promise<Payment> {
    const processor = PaymentProcessorFactory.create(method);

    // Validate payment details
    const validation = processor.validate(details);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Create payment record
    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountCents,
      currency,
      method,
      status: PaymentStatus.PENDING,
      details,
      authorizationId: null,
      transactionId: null,
      feeCents: 0,
      createdAt: new Date(),
    };

    // Authorize
    const authResult = await processor.authorize(payment);
    if (!authResult.success) {
      payment.status = PaymentStatus.FAILED;
      this.payments.set(payment.id, payment);
      throw new Error(`Authorization failed: ${authResult.message}`);
    }

    payment.authorizationId = authResult.authorizationId;
    payment.feeCents = authResult.feeCents;
    payment.status = PaymentStatus.AUTHORIZED;

    // Capture
    const captureResult = await processor.capture(
      payment.authorizationId!,
      amountCents
    );
    if (!captureResult.success) {
      payment.status = PaymentStatus.FAILED;
      this.payments.set(payment.id, payment);
      throw new Error(`Capture failed: ${captureResult.message}`);
    }

    payment.transactionId = captureResult.transactionId;
    payment.status = PaymentStatus.CAPTURED;
    this.payments.set(payment.id, payment);

    return payment;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new Error(`Cannot refund payment in status ${payment.status}`);
    }

    const processor = PaymentProcessorFactory.create(payment.method);
    const result = await processor.refund(
      payment.transactionId!,
      payment.amountCents
    );

    if (!result.success) {
      throw new Error(`Refund failed: ${result.message}`);
    }

    payment.status = PaymentStatus.REFUNDED;
    return payment;
  }

  getPayment(paymentId: string): Payment | undefined {
    return this.payments.get(paymentId);
  }

  compareFees(amountCents: number): Array<{ method: string; feeCents: number; feePercent: string }> {
    const methods = PaymentProcessorFactory.getAvailableMethods();
    return methods.map((method) => {
      const processor = PaymentProcessorFactory.create(method);
      const feeCents = processor.calculateFeeCents(amountCents);
      return {
        method: processor.methodName,
        feeCents,
        feePercent: ((feeCents / amountCents) * 100).toFixed(2) + "%",
      };
    });
  }
}

// ============================================================
// Example Usage
// ============================================================

async function runPaymentExample() {
  const service = new PaymentService();

  console.log("=== Fee Comparison for $100.00 ===");
  const fees = service.compareFees(10000);
  for (const fee of fees) {
    console.log(`  ${fee.method}: $${(fee.feeCents / 100).toFixed(2)} (${fee.feePercent})`);
  }

  console.log("\n=== Credit Card Payment ===");
  const ccPayment = await service.processPayment(
    PaymentMethod.CREDIT_CARD,
    5000, // $50.00
    "USD",
    {
      cardNumber: "4111111111111111",
      cardExpiry: "12/25",
      cardCvv: "123",
    }
  );
  console.log(
    `  Payment ${ccPayment.id}: ${ccPayment.status}, ` +
    `fee: $${(ccPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== PayPal Payment ===");
  const ppPayment = await service.processPayment(
    PaymentMethod.PAYPAL,
    7500, // $75.00
    "USD",
    { paypalEmail: "user@example.com" }
  );
  console.log(
    `  Payment ${ppPayment.id}: ${ppPayment.status}, ` +
    `fee: $${(ppPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== Refund Credit Card Payment ===");
  const refundedPayment = await service.refundPayment(ccPayment.id);
  console.log(`  Payment ${refundedPayment.id}: ${refundedPayment.status}`);

  console.log("\n=== Crypto Payment ===");
  const cryptoPayment = await service.processPayment(
    PaymentMethod.CRYPTO,
    25000, // $250.00
    "USD",
    {
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1E",
      cryptoCurrency: "ETH",
    }
  );
  console.log(
    `  Payment ${cryptoPayment.id}: ${cryptoPayment.status}, ` +
    `fee: $${(cryptoPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== Validation Error Example ===");
  try {
    await service.processPayment(
      PaymentMethod.CREDIT_CARD,
      1000,
      "USD",
      { cardNumber: "123" } // Invalid
    );
  } catch (err) {
    console.log(`  Expected error: ${(err as Error).message}`);
  }
}

runPaymentExample();
```

### SOLID Principles Applied
- **S**: Each processor handles only its own payment method logic. PaymentService orchestrates the flow. Factory handles instantiation.
- **O**: Adding a new payment method (e.g., Apple Pay) requires only a new class implementing IPaymentProcessor and registering it with the factory. Zero changes to existing code.
- **L**: All IPaymentProcessor implementations are interchangeable. The PaymentService does not know or care which concrete processor it is using.
- **I**: IPaymentProcessor is focused on payment operations only. Validation, processing, and fee calculation are all payment-related concerns.
- **D**: PaymentService depends on IPaymentProcessor (abstraction) and PaymentProcessorFactory. It never imports CreditCardProcessor directly.

### Extension Points
- **Apple Pay / Google Pay**: implement IPaymentProcessor, register with factory. Done.
- **Webhooks**: add a webhook listener for async payment confirmations (crypto confirmations, ACH settlements)
- **Idempotency**: add idempotency key to prevent duplicate charges (critical for production -- map to your idempotency_key pattern)
- **Partial refunds**: extend the refund method to accept a partial amount
- **Payment retry**: wrap authorization in a retry mechanism with exponential backoff (reuse the retry strategies from Problem 4)
- **Audit logging**: add an observer/listener that logs all payment events for compliance (similar to the state machine's transition listeners)
