const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create Express app
const app = express();
const port = 3002;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb+srv://mushthaq:GwagaqG3PBgFVq3b@cluster1.ighni.mongodb.net/student-mentor?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Models (Schemas)
const mentorSchema = new mongoose.Schema({
  name: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

const studentSchema = new mongoose.Schema({
  name: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  previousMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }
});

const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);

// Routes

// Create Mentor
app.post('/mentor', async (req, res) => {
  try {
    const mentor = new Mentor({ name: req.body.name });
    await mentor.save();
    res.status(201).json(mentor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Student
app.post('/student', async (req, res) => {
  try {
    const student = new Student({ name: req.body.name });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign Students to Mentor
app.post('/assign-student', async (req, res) => {
  try {
    const { mentorId, studentIds } = req.body;

    // Check for students without a mentor
    const students = await Student.find({ _id: { $in: studentIds }, mentor: null });

    if (students.length === 0) {
      return res.status(400).json({ message: "All students already have mentors" });
    }

    // Assign mentor to students
    await Student.updateMany(
      { _id: { $in: studentIds }, mentor: null },
      { mentor: mentorId }
    );

    // Add students to mentor's list
    await Mentor.findByIdAndUpdate(mentorId, { $push: { students: { $each: studentIds } } });

    res.status(200).json({ message: "Students assigned to mentor successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Show All Students for a Particular Mentor
app.get('/mentor/:id/students', async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id).populate('students');
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    res.status(200).json(mentor.students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change Mentor for a Student
app.post('/change-mentor', async (req, res) => {
  try {
    const { studentId, newMentorId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Save previous mentor
    student.previousMentor = student.mentor;

    // Change mentor
    student.mentor = newMentorId;
    await student.save();

    res.status(200).json({ message: "Mentor changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Show Previously Assigned Mentor for a Student
app.get('/student/:id/previous-mentor', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('previousMentor');
    if (!student || !student.previousMentor) {
      return res.status(404).json({ message: "No previous mentor found" });
    }
    res.status(200).json(student.previousMentor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Show Students Without a Mentor
app.get('/students/no-mentor', async (req, res) => {
  try {
    const students = await Student.find({ mentor: null });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
