# PayClaw MCP Tool Contract Reference

Formal contract for `@payclaw/mcp-server` tools. Use for client integration, testing, and documentation.

---

## Auth

- **API mode:** Requires `PAYCLAW_API_KEY` (pk_live_ / pk_test_). Calls PayClaw API with Bearer token.
- **Device flow:** If no key, `getAgentIdentity` initiates device auth; user approves at payclaw.io/activate. Consent Key stored locally.
- **Mock mode:** No API; `PAYCLAW_API_URL` unset or mock. Returns simulated data.

---

## Tools

### payclaw_getAgentIdentity

**Purpose:** Declare agent as authorized actor (Badge). No card, no money. Call before shopping.

**Inputs:**

| Name    | Type   | Required | Max | Description                                      |
|---------|--------|----------|-----|--------------------------------------------------|
| merchant| string | no       | 200 | Merchant or website (e.g. "starbucks.com")      |

**Outputs:**

| Field             | Type    | Description |
|-------------------|---------|-------------|
| product_name      | string  | "PayClaw Badge" |
| status            | string  | active, activation_required, error |
| agent_disclosure  | string  | Present to merchants when challenged |
| verification_token| string  | Token for merchant verify endpoint |
| trust_url         | string  | payclaw.io/trust |
| principal_verified| boolean | Human authorized |
| spend_available   | boolean | Wallet funded |
| activation_required| boolean| True when device flow started — show user code/URL |
| message           | string  | Error or activation instructions |

**Error codes:** `status: "error"` with `message` (e.g. "PAYCLAW_API_KEY not set", network errors).

**Flow:** First call with no key → device flow → `activation_required: true`, user approves → next call uses stored Consent Key → `status: "active"`.

---

### payclaw_getCard

**Purpose:** Get single-use virtual Visa for purchase. Must call `payclaw_getAgentIdentity` first.

**Inputs:**

| Name            | Type   | Required | Max  | Description                    |
|-----------------|-------|----------|------|--------------------------------|
| merchant        | string| yes      | 500  | Merchant where purchase is made|
| estimated_amount| number| yes      | 500  | Estimated amount in USD        |
| description     | string| yes      | 1000 | Brief description of purchase  |

**Outputs:**

| Field           | Type   | Description |
|-----------------|--------|-------------|
| product_name    | string | "PayClaw" |
| status          | string | approved, denied, pending_approval, error |
| intent_id       | string | UUID; required for reportPurchase |
| card            | object | number, exp_month, exp_year, cvv, billing_name, last_four |
| remaining_balance| number| Balance after hold |
| reason          | string | Denial reason (e.g. "Insufficient funds") |
| approve_endpoint| string | If pending_approval — where user approves |
| message         | string | Error or instructions |

**Status semantics:**

- `approved` — Card issued. Use card, then call `payclaw_reportPurchase`.
- `denied` — Policy rejected (insufficient balance, etc.).
- `pending_approval` — User must approve in dashboard; then retry or poll.
- `error` — API/config error.

**Error codes:** `status: "error"`, `message` (e.g. "PAYCLAW_API_KEY not set", API errors).

---

### payclaw_reportPurchase

**Purpose:** Report outcome after using card. Required — closes audit trail.

**Inputs:**

| Name             | Type   | Required | Max  | Description                    |
|------------------|-------|----------|------|--------------------------------|
| intent_id        | string| yes      | UUID | From payclaw_getCard           |
| success          | boolean| yes     | —    | Whether purchase succeeded     |
| actual_amount    | number| no       | 500  | Actual amount charged (USD)    |
| merchant_name    | string| no       | 500  | Merchant per receipt           |
| items            | string| no       | 2000 | Items purchased                |
| order_confirmation| string| no       | 200  | Order confirmation ID          |

**Outputs:**

| Field               | Type   | Description |
|---------------------|--------|-------------|
| product_name        | string | "PayClaw" |
| status              | string | recorded, error |
| transaction_id      | string | Recorded transaction |
| remaining_balance   | number | After capture |
| intent_match        | string | match, mismatch (amount within 20%) |
| intent_mismatch_reason| string | If mismatch |
| message             | string | Error message |

**Error codes:** `status: "error"`, `message` (e.g. "Intent not found", "Intent already reported").

---

## Call Order

1. `payclaw_getAgentIdentity` — before any shopping
2. `payclaw_getCard` — when ready to pay (user approves via MCP tool prompt)
3. `payclaw_reportPurchase` — after every purchase attempt (success or fail)

---

## References

- [README](../README.md) — Quick start, setup
- PayClaw app repo: ADR-0005 (MCP tool design) — decision record for tool structure
