from unittest.mock import AsyncMock, MagicMock

import pytest
from app.core.seed import run_seeders


async def test_run_seeders_executes_steps_in_one_transaction() -> None:
    session = MagicMock()
    transaction_context = AsyncMock()
    session.begin.return_value = transaction_context

    session_context = AsyncMock()
    session_context.__aenter__.return_value = session
    session_factory = MagicMock(return_value=session_context)

    first_step = AsyncMock()
    second_step = AsyncMock()

    await run_seeders(session_factory, [first_step, second_step])

    session.begin.assert_called_once_with()
    first_step.assert_awaited_once_with(session)
    second_step.assert_awaited_once_with(session)
    transaction_context.__aenter__.assert_awaited_once_with()
    transaction_context.__aexit__.assert_awaited_once()


async def test_run_seeders_stops_and_rolls_back_when_a_step_fails() -> None:
    session = MagicMock()
    transaction_context = AsyncMock()
    session.begin.return_value = transaction_context

    session_context = AsyncMock()
    session_context.__aenter__.return_value = session
    session_factory = MagicMock(return_value=session_context)

    failure = RuntimeError("seed failed")
    first_step = AsyncMock(side_effect=failure)
    second_step = AsyncMock()

    with pytest.raises(RuntimeError, match="seed failed"):
        await run_seeders(session_factory, [first_step, second_step])

    second_step.assert_not_awaited()
    transaction_context.__aexit__.assert_awaited_once()
    assert transaction_context.__aexit__.call_args.args[0] is RuntimeError
