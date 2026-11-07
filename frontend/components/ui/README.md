# Shared interface components

## Purpose

This folder gives ContextFlow one consistent set of buttons, form fields, cards, status labels, navigation links, tables, dialogs, and role choices.

## What it can do

- Show clear actions and unavailable states.
- Connect form labels, help, and errors.
- Present named statuses without relying on color alone.
- Present tables that remain usable on a narrow screen.
- Keep keyboard focus inside an open dialog and return it when the dialog closes.
- Explain each employee role, its allowed actions, and its restrictions.

## Business rules

- These components display information; they do not grant access or approve changes.
- Role selection is not permission enforcement. PR 2B owns that behavior.
- Existing dashboard screens are not redesigned by PR 2A.
- ContextFlow has one shared component set. Features must not create a competing visual system.
- Accessibility and clarity take priority over decorative effects.

## Design reference

Read `frontend/DESIGN.md` before adding or changing a shared interface component.
