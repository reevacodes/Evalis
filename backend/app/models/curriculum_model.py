from pydantic import BaseModel
from typing import List


class Topic(BaseModel):
    name: str


class Unit(BaseModel):
    unit_number: int
    topics: List[Topic]


class Subject(BaseModel):
    name: str
    code: str
    units: List[Unit]


class Curriculum(BaseModel):
    semester: int
    subjects: List[Subject]