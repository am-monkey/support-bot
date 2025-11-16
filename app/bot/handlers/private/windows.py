from contextlib import suppress

from aiogram.utils.markdown import hbold

from app.bot.manager import Manager


class Window:

    @staticmethod
    async def main_menu(manager: Manager, **_) -> None:
        """
        Display the main menu window.

        :param manager: Manager object.
        :return: None
        """
        text = manager.text_message.get("main_menu")
        with suppress(IndexError, KeyError):
            text = text.format(full_name=hbold(manager.user.full_name))
        await manager.send_message(text)
        await manager.state.set_state(None)
