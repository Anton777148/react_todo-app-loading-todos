import { TodoItem } from './TodoItem';
import * as postService from '../api/todos';
import { Todo } from '../types/Todo';
import { ErrorType } from '../types/ErrorType';
import { FilterType } from '../types/FilterType';
import classNames from 'classnames';
import { USER_ID } from '../api/todos';
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
// import { setTimeout } from 'timers';

export const Todolist: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<ErrorType | null>(null);
  const [filterBy, setFilterBy] = useState<FilterType>(FilterType.All);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = setTimeout(() => setError(null), 3000);

    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [error, newTodoTitle]);

  useEffect(() => {
    postService
      .getTodos(USER_ID)
      .then(setTodos)
      .catch(() => {
        setError(ErrorType.LoadTodos);
        setTimeout(() => setError(null), 3000);
      });
  }, []);

  const hadleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimedTitle = newTodoTitle.trim();

    if (!trimedTitle) {
      setError(ErrorType.NoTitle);
      setTimeout(() => setError(null), 3000);

      return;
    }

    const newTempTodo = {
      id: 1,
      title: newTodoTitle.trim(),
      completed: false,
      userId: USER_ID,
    };

    setTempTodo(newTempTodo);
    setIsAdded(true);
    setLoadingTodoIds(prev => [...prev, newTempTodo.id]);

    postService
      .createTodo({
        title: newTodoTitle.trim(),
        completed: false,
        userId: USER_ID,
      })
      .then(newTodo => {
        setTodos(currentTodos => [...currentTodos, newTodo]);
        setTempTodo(null);
        setNewTodoTitle('');
      })
      .catch(() => {
        setError(ErrorType.AddTodo);
        setTempTodo(null);

        if (inputRef.current) {
          inputRef.current.focus();
        }
      })
      .finally(() => {
        setIsAdded(false);
      });
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter(todo => todo.completed);
    const completedIds = completedTodos.map(todo => todo.id);

    setLoadingTodoIds(prev => [...prev, ...completedIds]);

    const deletePromises = completedTodos.map(todo =>
      postService
        .deleteTodo(todo.id)
        .then(() => {
          return { id: todo.id, success: true };
        })
        .catch(() => {
          return { id: todo.id, success: false };
        }),
    );

    try {
      const results = await Promise.all(deletePromises);

      const successfullyDeletedTodos = results
        .filter(result => result.success)
        .map(result => result.id);

      const filedTodos = results
        .filter(result => !result.success)
        .map(result => result.id);

      setTodos(prevTodos =>
        prevTodos.filter(todo => successfullyDeletedTodos.includes(todo.id)),
      );

      if (filedTodos.length > 0) {
        setError(ErrorType.DeleteTodo);
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setLoadingTodoIds(prev => prev.filter(id => !completedIds.includes(id)));

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const deleteTodo = (todoId: number) => {
    setLoadingTodoIds(prev => [...prev, todoId]);

    postService
      .deleteTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );

        if (inputRef.current) {
          inputRef.current.focus();
        }
      })
      .finally(() =>
        setLoadingTodoIds(prev => prev.filter(id => id !== todoId)),
      );
  };

  const handleToggle = (id: number) => {
    setLoadingTodoIds(prev => [...prev, id]);

    setTimeout(() => {
      setTodos(
        todos.map(todo =>
          todo.id !== id ? { ...todo, completed: !todo.completed } : todo,
        ),
      );

      setLoadingTodoIds(prev => prev.filter(todoId => todoId !== id));
    }, 3000);
  };

  const handleToggleAll = () => {
    const allCompleted = todos.every(todo => todo.completed);

    const updateTodos = todos.map(todo => ({
      ...todo,
      completed: !allCompleted,
    }));

    const allTodosIds = todos.map(todo => todo.id);

    setLoadingTodoIds(prev => [...prev, ...allTodosIds]);

    setTimeout(() => {
      setTodos(updateTodos);

      setLoadingTodoIds(prev => prev.filter(id => !allTodosIds.includes(id)));
    }, 3000);
  };

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (filterBy === FilterType.Active) {
        return !todo.completed;
      } else if (filterBy === FilterType.Completed) {
        return todo.completed;
      }

      return true;
    });
  }, [todos, filterBy]);

  const activeTodos = todos.filter(todo => !todo.completed);
  const completeTodos = todos.filter(todo => todo.completed);

  const handleFilterClick =
    (filter: FilterType) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setFilterBy(filter);
    };

  const filters = [
    { type: FilterType.All, label: 'All', cy: 'FilterLinkAll' },
    { type: FilterType.Active, label: 'Active', cy: 'FilterLinkActive' },
    {
      type: FilterType.Completed,
      label: 'Completed',
      cy: 'FilterLinkCompleted',
    },
  ];

  return (
    <div className="todoapp">
      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {!!todos.length && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.every(todo => todo.completed),
              })}
              data-cy="ToggleAllButton"
              onClick={handleToggleAll}
            />
          )}

          {/* Add a todo on form submit */}
          <form onSubmit={hadleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              autoFocus
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={isAdded}
              ref={inputRef}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onDelete={deleteTodo}
              onToggle={handleToggle}
              isLoading={loadingTodoIds.includes(todo.id)}
            />
          ))}

          {tempTodo && (
            <TodoItem
              key={tempTodo.id}
              todo={tempTodo}
              {...tempTodo}
              onDelete={deleteTodo}
              onToggle={handleToggle}
              isLoading={loadingTodoIds.includes(tempTodo.id)}
            />
          )}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${activeTodos.length} items left`}
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              {filters.map(({ type, label, cy }) => (
                <a
                  key={type}
                  href={`"#/${label}"`}
                  className={classNames('filter__link', {
                    selected: filterBy === type,
                  })}
                  data-cy={cy}
                  onClick={handleFilterClick(type)}
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={completeTodos.length === 0}
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button data-cy="HideErrorButton" type="button" className="delete" />
        {/* show only one message at a time */}
        {error}
        <br />
      </div>
    </div>
  );
};
