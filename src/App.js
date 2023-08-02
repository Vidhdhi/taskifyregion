// src/App.js
import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  TextField,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

import './App.css';

const ItemTypes = {
  TASK: 'task',
};

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          status: doc.data().status,
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const moveTask = async (id, newStatus) => {
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, { status: newStatus });
  };

  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const editTask = async (id, newTitle) => {
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, { title: newTitle });
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      await addDoc(collection(db, 'tasks'), {
        title: input,
        status: 'todo',
        timestamp: serverTimestamp(),
      });
      setInput('');
    }
  };

  const Task = ({ id, title, status }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.TASK,
      item: { id, title, status },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: ItemTypes.TASK,
      canDrop: (item) => item.status !== status,
      drop: (item) => {
        if (item.status === 'todo') {
          moveTask(item.id, status); // Move to the current column's status
        } else if (item.status === 'inprocess') {
          if (status === 'complete') {
            moveTask(item.id, status); // Move to 'Complete' if dropped on the 'Complete' column
          } else {
            moveTask(item.id, 'inprocess'); // Move back to 'In Process' if dropped on other columns
          }
        }
      },
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);

    const handleEditClick = () => {
      setIsEditing(true);
    };

    const handleEditConfirm = () => {
      if (editedTitle.trim() !== title) {
        editTask(id, editedTitle);
      }
      setIsEditing(false);
    };

    const handleMoveToInProcess = () => {
      moveTask(id, 'inprocess');
    };

    const handleMoveToComplete = () => {
      moveTask(id, 'complete');
    };

    return (
      <div ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Paper elevation={3} className="task" sx={{ margin: '10px', padding: '4%' }}>
          {isEditing ? (
            <>
              <TextField
                variant="outlined"
                size="small"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
              />
              <Button onClick={handleEditConfirm}>Confirm</Button>
            </>
          ) : (
            <>
              <Typography variant="body1">{title}</Typography>
              <Button variant='contained' onClick={handleEditClick}>Edit</Button>
              <Button variant='contained' onClick={() => deleteTask(id)}>Delete</Button>

              {status === 'todo' && (
                <>
                  <Button variant='contained' onClick={handleMoveToInProcess}>Move to In Process</Button>
                  <Button variant='contained' onClick={handleMoveToComplete}>Move to Complete</Button>
                </>
              )}
              {status === 'inprocess' && (
                <Button variant='contained' onClick={handleMoveToComplete}>Move to Complete</Button>
              )}
            </>
          )}
        </Paper>
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Taskify (Task Management)</Typography>
        </Toolbar> 
      </AppBar>
      <Container className="App" sx={{ marginTop: '40px', marginBottom: '40px' }}>
        <form>
          <TextField
            id="outlined-basic"
            label="Make Task"
            variant="outlined"
            style={{ margin: '0px 5px' }}
            size="small"
            value={input || ''}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={addTask}>
            Add Task
          </Button>
        </form>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="h6">Todo</Typography>
            {tasks
              .filter((task) => task.status === 'todo')
              .map((task) => (
                <Task key={task.id} {...task} />
              ))}
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">In Process</Typography>
            {tasks
              .filter((task) => task.status === 'inprocess')
              .map((task) => (
                <Task key={task.id} {...task} />
              ))}
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">Complete</Typography>
            {tasks
              .filter((task) => task.status === 'complete')
              .map((task) => (
                <Task key={task.id} {...task} 
                />
              ))}
          </Grid>
        </Grid>
      </Container>
    </DndProvider>
  );
};

export default App;
