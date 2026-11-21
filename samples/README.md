# Sample test PDFs for MediShield

| File | Purpose |
|------|---------|
| `sample_insurance_policy.pdf` | PPO Gold policy with coverage caps, duplicate E/M rules, supply bundling |
| `sample_hospital_bill.pdf` | Itemized bill with duplicate 99223, overpriced CT 70450, unbundled J3490, undocumented 99070 |

## Expected wrongful charges

- **99223** duplicate initial hospital visit (~$1,850)
- **70450** CT over $2,100 allowed amount (~$2,100 savings)
- **J3490** unbundled IV saline
- **99070** supplies over $545 undocumented cap

## How to test in the UI

1. Open http://127.0.0.1:5173
2. Upload `sample_insurance_policy.pdf` as the insurance policy
3. Upload `sample_hospital_bill.pdf` as the hospital bill
4. Confirm wrongly billed items and savings appear on the right
