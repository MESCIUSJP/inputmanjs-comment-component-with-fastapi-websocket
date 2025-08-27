from pydantic import BaseModel
from typing import Union

class CommentIn(BaseModel):
    userId: int
    parentId: Union[int, str, None] = None
#    stick: Union[bool, None] = False
    sticked: Union[bool, None] = False
#    updateType: Union[str, None] = None
    content: str
    mentionInfo: Union[str, None] = None

class ReactionIn(BaseModel):
    reactionChar: str
    commentId: int
    userId: int
