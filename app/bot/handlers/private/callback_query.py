from aiogram import Router, F
from aiogram.filters import StateFilter
from aiogram.types import CallbackQuery

router = Router()
router.callback_query.filter(F.message.chat.type == "private", StateFilter(None))


@router.callback_query()
async def handler(call: CallbackQuery) -> None:
    """
    Handles callback queries in private chats.

    :param call: CallbackQuery object.
    :return: None
    """
    await call.answer()
