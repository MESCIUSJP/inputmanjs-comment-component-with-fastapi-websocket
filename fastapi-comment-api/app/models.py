from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from .database import Base

class Comment(Base):
    __tablename__ = "comments"
    id = Column('id', Integer, primary_key=True)
    parentCommentId = Column('parentCommentId', Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column('content', Text)
    userId = Column('userId', Integer)
    mentionInfo = Column('mentionInfo', Text, nullable=True)
    postTime = Column('postTime', DateTime)
    updateTime = Column('updateTime', DateTime)
#    stick = Column('stick', Boolean, default=False)
    sticked = Column('sticked', Boolean, default=False)
#    updateType = Column('updateType', String, nullable=True)

class User(Base):
    __tablename__ = "users"
    id =  Column('id', Integer, primary_key=True)
    username = Column('username', String)
    avatar = Column('avatar', String)

class Reaction(Base):
    __tablename__ = "reactions"
    id = Column('id', Integer, primary_key=True)
    commentId = Column('commentId', Integer, ForeignKey("comments.id", ondelete="CASCADE"))
    userId = Column('userId', Integer)
    reactionChar = Column('reactionChar', Text)
