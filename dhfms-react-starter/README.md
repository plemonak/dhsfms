# DYKAT HSEFMS — React / SharePoint Starter

Αυτό είναι το πρώτο καθαρό codebase για να φύγουμε από Power Apps UI και να χτίσουμε επαγγελματική web εφαρμογή.

## Τι είναι

- React + TypeScript frontend
- GitHub / Codespaces ready
- Mobile-first responsive UI
- DYKAT red/navy enterprise style
- Mock data για άμεσο preview χωρίς SharePoint σύνδεση
- Service layer ώστε αργότερα να συνδεθεί με SharePoint lists και Power Automate flows

## Τι περιλαμβάνει ήδη

- Dashboard / Κέντρο ελέγχου
- Προσωπικό
- Καρτέλα εργαζομένου με tabs
- Νέος εργαζόμενος
- Εκπαιδεύσεις / υπογραφή / PDF placeholder
- ΜΑΠ
- Ιατρικές βεβαιώσεις
- Άδειες / πιστοποιήσεις
- Οχήματα & μηχανήματα
- Εξοπλισμός
- Εργοτάξια
- Υπεργολάβοι
- Smart Document Capture placeholder
- QR preview placeholder

## Πώς το τρέχεις σε GitHub Codespaces

1. Δημιουργείς νέο GitHub repository, π.χ. `dhfms`.
2. Ανεβάζεις όλα τα αρχεία αυτού του φακέλου.
3. Πατάς **Code > Codespaces > Create codespace on main**.
4. Περιμένεις να τρέξει το `npm install`.
5. Στο terminal γράφεις:

```bash
npm run dev
```

6. Ανοίγεις το forwarded port `5173`.

## Πώς το τρέχεις τοπικά στο PC

Χρειάζεται Node.js.

```bash
npm install
npm run dev
```

Μετά ανοίγεις το URL που θα δείξει το terminal, συνήθως:

```text
http://localhost:5173
```

## Πώς θα συνδεθεί με SharePoint αργότερα

Σήμερα χρησιμοποιεί mock data από:

```text
src/data/mockData.ts
```

Η σύνδεση με SharePoint θα μπει στο:

```text
src/services/sharePointProvider.ts
```

και θα αντικαταστήσει το:

```text
src/services/dataProvider.ts
```

## Πού θα μπαίνουν τα Power Automate flows

Η αρχική θέση είναι:

```text
src/services/flowClient.ts
```

Εκεί θα μπουν κλήσεις για:

- GenerateTrainingForm / PDF
- evidence upload αν δεν γίνεται απευθείας σε SharePoint library
- duplicate checks όπου χρειάζεται

## Αρχιτεκτονική

```text
src/
  components/      reusable UI pieces
  pages/           application screens/pages
  services/        SharePoint / flows / data access
  data/            mock demo data
  types/           TypeScript models
  styles/          theme and layout CSS
```

## Κανόνας ανάπτυξης

Δεν φτιάχνουμε πλέον οθόνες μία-μία χειροκίνητα όπως στο Power Apps. Φτιάχνουμε components:

- AppShell
- PageHeader
- SiteContextBar
- MetricCard
- ModuleTile
- StatusBadge
- SectionCard
- FormField
- EvidenceUpload
- SignaturePanel
- QRPanel

Αν αλλάξει ένα component, αλλάζει παντού.
