const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let customers = [];
let instructors = [];
let classes = [];
let packages = [];
let sales = [];
let attendance = [];

app.get('/', (req, res) => {
  res.send('YogiTrack API running');
});

// customers
app.get('/customers', (req, res) => {
  res.json(customers);
});

app.post('/customers', (req, res) => {
  const { firstName, lastName } = req.body;

  const newCustomer = {
    id: `C${customers.length + 1}`,
    firstName,
    lastName,
    classBalance: 0
  };

  customers.push(newCustomer);

  res.json(newCustomer);
});

// instructors
app.get('/instructors', (req, res) => {
  res.json(instructors);
});

app.post('/instructors', (req, res) => {
  const { firstName, lastName } = req.body;

  const newInstructor = {
    id: `I${instructors.length + 1}`,
    firstName,
    lastName
  };

  instructors.push(newInstructor);

  res.json(newInstructor);
});

// classes
app.get('/classes', (req, res) => {
  res.json(classes);
});

app.post('/classes', (req, res) => {
  const { title, instructorId, date, time } = req.body;

  const conflict = classes.find(c =>
    c.instructorId === instructorId &&
    c.date === date &&
    c.time === time
  );

  if (conflict) {
    return res.json({ message: 'Schedule conflict: instructor already has a class at that time' });
  }

  const newClass = {
    id: classes.length + 1,
    title,
    instructorId,
    date,
    time
  };

  classes.push(newClass);

  res.json(newClass);
});

// packages
app.get('/packages', (req, res) => {
  res.json(packages);
});

app.post('/packages', (req, res) => {
  const { name, classCount, price } = req.body;

  const newPackage = {
    id: packages.length + 1,
    name,
    classCount,
    price
  };

  packages.push(newPackage);

  res.json(newPackage);
});

// sales
app.get('/sales', (req, res) => {
  res.json(sales);
});

app.post('/sales', (req, res) => {
  const { customerId, packageId } = req.body;

  const customer = customers.find(c => c.id === customerId);
  const selectedPackage = packages.find(p => p.id === packageId);

  if (!customer) {
    return res.json({ message: 'Customer not found' });
  }

  if (!selectedPackage) {
    return res.json({ message: 'Package not found' });
  }

  customer.classBalance += selectedPackage.classCount;
  
  const newSale = {
    id: sales.length + 1,
    customerId,
    packageId,
    classCountAdded: selectedPackage.classCount,
    amount: selectedPackage.price,
    timestamp: new Date().toISOString()
  };

  sales.push(newSale);

  res.json(newSale);
});

// attendance
app.get('/attendance', (req, res) => {
  res.json(attendance);
});

app.post('/attendance', (req, res) => {
  const { customerId, classId } = req.body;

  const customer = customers.find(c => c.id === customerId);
  const selectedClass = classes.find(c => c.id === classId);

  if (!customer) {
    return res.json({ message: 'Customer not found' });
  }

  if (!selectedClass) {
    return res.json({ message: 'Class not found' });
  }

  if (customer.classBalance <= 0) {
    return res.json({ message: 'No remaining class balance' });
  }

  customer.classBalance -= 1;

  const newAttendance = {
    id: attendance.length + 1,
    customerId,
    classId
  };

  attendance.push(newAttendance);

  res.json(newAttendance);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});