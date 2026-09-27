## ADDED Requirements

### Requirement: The app states the platform it requires, and it is the platform it ships on

The application SHALL declare the same minimum macOS version in its package and
in its bundle, and that version SHALL be the release the app is built against.

#### Scenario: The declared floor and the bundle agree
- **WHEN** the app bundle is inspected
- **THEN** its minimum system version equals the package's platform target, and neither names a release three generations old

### Requirement: The app claims only the languages it speaks

The application SHALL NOT declare a localization it does not provide. Every
language the bundle declares SHALL have strings the views actually use.

#### Scenario: A declared language with no strings in the code
- **WHEN** the bundle declares a language
- **THEN** every user-visible string in the app is expressed in that language or is expressed in the language the app declares

#### Scenario: Removing an unsupported claim
- **WHEN** the app does not translate its interface
- **THEN** the bundle declares only the language it ships, and no unused translation resource remains in it

### Requirement: The journey is visible in the window

The application SHALL show which step of the journey the reader is on, and
SHALL show it without the reader having to remember.

#### Scenario: The reader cannot tell where they are
- **WHEN** the window is on any step of the journey
- **THEN** the current step is named in the window, and the steps already passed are distinguishable from the ones still to come

### Requirement: The app has the scenes a Mac application is expected to have

The application SHALL provide an About window, a Settings scene and a Help
anchor, and SHALL expose its journey actions as menu commands with keyboard
shortcuts.

#### Scenario: The About window
- **WHEN** the About item is chosen from the application menu
- **THEN** a window opens naming the application, its version, and where its
  source lives

#### Scenario: A journey action has a shortcut
- **WHEN** the reader looks at the application menu
- **THEN** the action that continues the journey is listed, with a keyboard shortcut that performs it

### Requirement: A project the reader worked on can be reopened

The application SHALL keep the projects the reader has opened and SHALL offer to
reopen them. The list SHALL survive the window closing.

#### Scenario: Reopening a recent project
- **WHEN** the reader opens the recent list and chooses a project
- **THEN** that project is inspected and the window shows it, without a file
  dialog

#### Scenario: An empty list states itself
- **WHEN** the reader opens the recent list and no project has been opened
- **THEN** the list says so, and offers no disabled control that looks usable

### Requirement: Glass marks the functional layer, not the content

The application SHALL use translucent material for navigation and controls
only, and SHALL NOT use it as the material behind the content a reader reads.

#### Scenario: A capability table is read
- **WHEN** a screen shows a table of findings
- **THEN** the table's own surface is opaque, and only the surrounding navigation
  and controls are translucent
