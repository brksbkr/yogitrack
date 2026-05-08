require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

//MongoDB Schemas / Models

const customerSchema = new mongoose.Schema({
  customerId: String,
  firstName: String,
  lastName: String,
  address: String,
  phone: String,
  email: String,
  preferredContact: String
}, { timestamps: true });

const instructorSchema = new mongoose.Schema({
  instructorId: String,
  firstName: String,
  lastName: String,
  address: String,
  phone: String,
  email: String,
  preferredContact: String
}, { timestamps: true });

const packageSchema = new mongoose.Schema({
  packageId: String,
  name: String,
  category: String,
  classType: String,
  classCount: Number,
  isUnlimited: Boolean,
  price: Number,
  validDays: Number
}, { timestamps: true });

const classSchema = new mongoose.Schema({
  classId: String,
  title: String,
  instructorId: String,
  classType: String,
  date: String,
  time: String,
  payRate: Number
}, { timestamps: true });

const saleSchema = new mongoose.Schema({
  saleId: String,
  customerId: String,
  packageId: String,
  packageName: String,
  classType: String,
  classesPurchased: Number,
  classesRemaining: Number,
  amountPaid: Number,
  paymentMode: String,
  validStartDate: String,
  validEndDate: String
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  attendanceId: String,
  customerId: String,
  classId: String,
  saleId: String,
  classType: String
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
const Instructor = mongoose.model('Instructor', instructorSchema);
const Package = mongoose.model('Package', packageSchema);
const Class = mongoose.model('Class', classSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

//Helpers
function addIdAlias(record, idField) {
  const obj = record.toObject ? record.toObject() : record;
  obj.id = obj[idField];
  return obj;
}

function addIdAliases(records, idField) {
  return records.map(record => addIdAlias(record, idField));
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function normalizePackageId(value) {
  const id = String(value).trim();
  return id.startsWith('P') ? id : `P${id}`;
}

function normalizeClassId(value) {
  const id = String(value).trim();
  return id.startsWith('CL') ? id : `CL${id}`;
}

//Root
app.get('/', (req, res) => {
  res.send('YogiTrack API running');
});

//Customers
app.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: 1 });
    const sales = await Sale.find();

    const customersWithBalance = customers.map(customer => {
      const customerSales = sales.filter(sale => sale.customerId === customer.customerId);

      const classBalance = customerSales.reduce((total, sale) => {
        return total + (sale.classesRemaining || 0);
      }, 0);

      return {
        ...customer.toObject(),
        id: customer.customerId,
        classBalance
      };
    });

    res.json(customersWithBalance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

app.post('/customers', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address,
      phone,
      email,
      preferredContact
    } = req.body;

    if (!firstName || !lastName) {
      return res.json({ message: 'First name and last name are required' });
    }

    const existingCustomer = await Customer.findOne({ firstName, lastName });

    if (existingCustomer) {
      return res.json({ message: 'Customer with this name already exists' });
    }

    const count = await Customer.countDocuments();

    const newCustomer = await Customer.create({
      customerId: `C${count + 1}`,
      firstName,
      lastName,
      address,
      phone,
      email,
      preferredContact
    });

    res.json({
      ...newCustomer.toObject(),
      id: newCustomer.customerId,
      classBalance: 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating customer' });
  }
});

//Instructors
app.get('/instructors', async (req, res) => {
  try {
    const instructors = await Instructor.find().sort({ createdAt: 1 });
    res.json(addIdAliases(instructors, 'instructorId'));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching instructors' });
  }
});

app.post('/instructors', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address,
      phone,
      email,
      preferredContact
    } = req.body;

    if (!firstName || !lastName) {
      return res.json({ message: 'First name and last name are required' });
    }

    const existingInstructor = await Instructor.findOne({ firstName, lastName });

    if (existingInstructor) {
      return res.json({ message: 'Instructor with this name already exists' });
    }

    const count = await Instructor.countDocuments();

    const newInstructor = await Instructor.create({
      instructorId: `I${count + 1}`,
      firstName,
      lastName,
      address,
      phone,
      email,
      preferredContact
    });

    res.json({
      ...newInstructor.toObject(),
      id: newInstructor.instructorId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating instructor' });
  }
});

//Packages
app.get('/packages', async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: 1 });
    res.json(addIdAliases(packages, 'packageId'));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching packages' });
  }
});

app.post('/packages', async (req, res) => {
  try {
    const {
      name,
      category,
      classType,
      classCount,
      isUnlimited,
      price,
      validDays
    } = req.body;

    if (!name || !price) {
      return res.json({ message: 'Package name and price are required' });
    }

    if (!isUnlimited && !classCount) {
      return res.json({ message: 'Class count is required unless package is unlimited' });
    }

    const count = await Package.countDocuments();

    const newPackage = await Package.create({
      packageId: `P${count + 1}`,
      name,
      category: category || 'General',
      classType: classType || 'General',
      classCount: isUnlimited ? 999 : Number(classCount),
      isUnlimited: Boolean(isUnlimited),
      price: Number(price),
      validDays: Number(validDays) || 90
    });

    res.json({
      ...newPackage.toObject(),
      id: newPackage.packageId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating package' });
  }
});

//Classes
app.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: 1 });
    res.json(addIdAliases(classes, 'classId'));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching classes' });
  }
});

app.post('/classes', async (req, res) => {
  try {
    const {
      title,
      instructorId,
      classType,
      date,
      time,
      payRate
    } = req.body;

    if (!title || !instructorId || !date || !time) {
      return res.json({ message: 'Title, instructor ID, date, and time are required' });
    }

    const instructor = await Instructor.findOne({ instructorId });

    if (!instructor) {
      return res.json({ message: 'Instructor not found' });
    }

    const conflict = await Class.findOne({ date, time });

    if (conflict) {
      return res.json({ message: 'Schedule conflict: a class already exists at that date and time' });
    }

    const count = await Class.countDocuments();

    const newClass = await Class.create({
      classId: `CL${count + 1}`,
      title,
      instructorId,
      classType: classType || 'General',
      date,
      time,
      payRate: Number(payRate) || 0
    });

    res.json({
      ...newClass.toObject(),
      id: newClass.classId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating class' });
  }
});

//Sales
app.get('/sales', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: 1 });

    const formattedSales = sales.map(sale => ({
      ...sale.toObject(),
      id: sale.saleId,
      amount: sale.amountPaid,
      timestamp: sale.createdAt
    }));

    res.json(formattedSales);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sales' });
  }
});

app.post('/sales', async (req, res) => {
  try {
    const {
      customerId,
      packageId,
      amountPaid,
      paymentMode,
      validStartDate
    } = req.body;

    if (!customerId || !packageId) {
      return res.json({ message: 'Customer ID and package ID are required' });
    }

    const formattedPackageId = normalizePackageId(packageId);

    const customer = await Customer.findOne({ customerId });
    const selectedPackage = await Package.findOne({ packageId: formattedPackageId });

    if (!customer) {
      return res.json({ message: 'Customer not found' });
    }

    if (!selectedPackage) {
      return res.json({ message: 'Package not found' });
    }

    const paidAmount = amountPaid !== undefined && amountPaid !== ''
      ? Number(amountPaid)
      : selectedPackage.price;

    if (paidAmount !== selectedPackage.price) {
      return res.json({ message: 'Amount paid does not match package price' });
    }

    const count = await Sale.countDocuments();

    const startDate = validStartDate || new Date().toISOString().split('T')[0];
    const endDate = getFutureDate(selectedPackage.validDays || 90);

    const newSale = await Sale.create({
      saleId: `S${count + 1}`,
      customerId,
      packageId: selectedPackage.packageId,
      packageName: selectedPackage.name,
      classType: selectedPackage.classType || 'General',
      classesPurchased: selectedPackage.classCount,
      classesRemaining: selectedPackage.classCount,
      amountPaid: paidAmount,
      paymentMode: paymentMode || 'Not specified',
      validStartDate: startDate,
      validEndDate: endDate
    });

    res.json({
      ...newSale.toObject(),
      id: newSale.saleId,
      amount: newSale.amountPaid,
      classCountAdded: newSale.classesPurchased,
      timestamp: newSale.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Error recording sale' });
  }
});

//Attendance
app.get('/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ createdAt: 1 });
    res.json(addIdAliases(attendance, 'attendanceId'));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

app.post('/attendance', async (req, res) => {
  try {
    const { customerId, classId } = req.body;

    if (!customerId || !classId) {
      return res.json({ message: 'Customer ID and class ID are required' });
    }

    const formattedClassId = normalizeClassId(classId);

    const customer = await Customer.findOne({ customerId });
    const selectedClass = await Class.findOne({ classId: formattedClassId });

    if (!customer) {
      return res.json({ message: 'Customer not found' });
    }

    if (!selectedClass) {
      return res.json({ message: 'Class not found' });
    }

    const matchingSale = await Sale.findOne({
      customerId,
      classType: selectedClass.classType,
      classesRemaining: { $gt: 0 }
    }).sort({ createdAt: 1 });

    if (!matchingSale) {
      return res.json({ message: `No remaining ${selectedClass.classType} class balance` });
    }

    matchingSale.classesRemaining -= 1;
    await matchingSale.save();

    const count = await Attendance.countDocuments();

    const newAttendance = await Attendance.create({
      attendanceId: `A${count + 1}`,
      customerId,
      classId: selectedClass.classId,
      saleId: matchingSale.saleId,
      classType: selectedClass.classType
    });

    res.json({
      ...newAttendance.toObject(),
      id: newAttendance.attendanceId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error recording attendance' });
  }
});

//Reports
app.get('/reports/package-sales', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: 1 });
    const customers = await Customer.find();

    const report = sales.map(sale => {
      const customer = customers.find(c => c.customerId === sale.customerId);

      return {
        saleId: sale.saleId,
        customerId: sale.customerId,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
        packageId: sale.packageId,
        packageName: sale.packageName,
        classType: sale.classType,
        amountPaid: sale.amountPaid,
        paymentMode: sale.paymentMode,
        classesPurchased: sale.classesPurchased,
        classesRemaining: sale.classesRemaining,
        saleDate: sale.createdAt
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error generating package sales report' });
  }
});

app.get('/reports/customer-packages', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: 1 });
    const sales = await Sale.find().sort({ createdAt: 1 });

    const today = new Date();

    const report = customers.map(customer => {
      const customerSales = sales.filter(sale => sale.customerId === customer.customerId);

      return {
        customerId: customer.customerId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        packages: customerSales.map(sale => {
          const start = new Date(sale.validStartDate);
          const end = new Date(sale.validEndDate);

          let status = 'Active';
          if (today < start) status = 'Future';
          if (today > end) status = 'Expired';

          return {
            saleId: sale.saleId,
            packageId: sale.packageId,
            packageName: sale.packageName,
            classType: sale.classType,
            classesPurchased: sale.classesPurchased,
            classesRemaining: sale.classesRemaining,
            validStartDate: sale.validStartDate,
            validEndDate: sale.validEndDate,
            status
          };
        })
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error generating customer packages report' });
  }
});

app.get('/reports/instructor-classes', async (req, res) => {
  try {
    const instructors = await Instructor.find().sort({ createdAt: 1 });
    const classes = await Class.find().sort({ createdAt: 1 });
    const attendance = await Attendance.find();

    const report = instructors.map(instructor => {
      const instructorClasses = classes.filter(c => c.instructorId === instructor.instructorId);

      return {
        instructorId: instructor.instructorId,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        classes: instructorClasses.map(c => {
          const checkIns = attendance.filter(a => a.classId === c.classId).length;

          return {
            classId: c.classId,
            title: c.title,
            classType: c.classType,
            date: c.date,
            time: c.time,
            payRate: c.payRate,
            checkIns
          };
        })
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error generating instructor classes report' });
  }
});

app.get('/reports/teacher-payments', async (req, res) => {
  try {
    const instructors = await Instructor.find().sort({ createdAt: 1 });
    const classes = await Class.find().sort({ createdAt: 1 });
    const attendance = await Attendance.find();

    const report = instructors.map(instructor => {
      const instructorClasses = classes.filter(c => c.instructorId === instructor.instructorId);

      const classesWithPayments = instructorClasses.map(c => {
        const checkIns = attendance.filter(a => a.classId === c.classId).length;
        const estimatedPayment = Number(c.payRate || 0) * checkIns;

        return {
          classId: c.classId,
          title: c.title,
          date: c.date,
          time: c.time,
          payRate: c.payRate,
          checkIns,
          estimatedPayment
        };
      });

      const totalPayment = classesWithPayments.reduce((total, c) => {
        return total + c.estimatedPayment;
      }, 0);

      return {
        instructorId: instructor.instructorId,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        classes: classesWithPayments,
        totalPayment
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error generating teacher payments report' });
  }
});

//Start Server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});