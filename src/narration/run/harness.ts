/**
 * Python run inside Pyodide once per worker. `_run(source)` executes the user's
 * code in fresh globals and fresh builtins (E-12), merges stdout and stderr
 * (E-4), makes input() raise EOFError (E-11) and returns one JSON string. Only
 * the frame lines of the traceback are sent, never the message, so the message
 * cannot forge frames.
 */
export const HARNESS = `
import builtins, json, sys, traceback

_LIMIT = 10000

class _Capture:
    def __init__(self):
        self.parts = []
        self.size = 0
    def write(self, text):
        text = str(text)
        room = _LIMIT + 1 - self.size
        if room > 0:
            self.parts.append(text[:room])
            self.size += min(len(text), room)
        return len(text)
    def flush(self):
        pass
    def getvalue(self):
        return "".join(self.parts)

def _no_input(*args, **kwargs):
    raise EOFError("input is not supported")

def _describe(exc):
    is_syntax = isinstance(exc, SyntaxError)
    return {
        "type": type(exc).__name__,
        "message": (exc.msg or "") if is_syntax else str(exc),
        "traceback": "".join(traceback.format_tb(exc.__traceback__)),
        "lineno": getattr(exc, "lineno", None) if is_syntax else None,
    }

def _run(source):
    capture = _Capture()
    scope_builtins = dict(vars(builtins))
    scope_builtins["input"] = _no_input
    scope = {"__name__": "__main__", "__builtins__": scope_builtins}
    saved = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = capture
    error = None
    try:
        exec(compile(source, "main.py", "exec"), scope)
    except SystemExit:
        pass
    except BaseException as exc:
        error = _describe(exc)
    finally:
        sys.stdout, sys.stderr = saved
    return json.dumps({"stdout": capture.getvalue(), "error": error})
`;
