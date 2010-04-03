include('ringo/unittest');
include('./testconsts');
var fs = require('fs-base');
var {Store} = require('ringo/storage/filestore');
var dbPath = fs.join(system.prefix, 'test', 'testdb');
var store = new Store(dbPath);
var person, Person = store.defineClass('Person');

exports.testPersistCreation = function () {
    person = createTestPerson();
    person.save();
    person = Person.get(1);
    assertNotNull(person);
    assertEqual(FIRST_NAME_1, person.firstName);
    assertEqual(LAST_NAME, person.lastName);
    assertEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
};

exports.testPersistUpdating = function () {
    person = Person.all()[0];
    assertNotNull(person);
    person.firstName = FIRST_NAME_2;
    person.save();
    person = Person.get(1);
    assertNotNull(person);
    assertEqual(FIRST_NAME_2, person.firstName);
    assertEqual(LAST_NAME, person.lastName);
    assertEqual(new Date(BIRTH_DATE_MILLIS), person.birthDate);
};

exports.testBasicQuerying = function () {
    assertEqual(1, Person.all().length);
    assertEqual(LAST_NAME, Person.all()[0].lastName);
    assertEqual(LAST_NAME, Person.query().equals('lastName', LAST_NAME).
            select('lastName')[0]);
    assertEqual(1, Person.query().equals('lastName', LAST_NAME).select().
            length);
};

exports.testPersistDeletion = function () {
    person.remove();
    person = Person.get(1);
    assertNull(person);
    assertEqual(0, Person.all().length);
    cleanUpTestDbDir();
};

function createTestPerson() {
    var testPerson = new Person();
    testPerson.firstName = FIRST_NAME_1;
    testPerson.lastName = LAST_NAME;
    testPerson.birthDate = new Date(BIRTH_DATE_MILLIS);
    return testPerson;
}

function cleanUpTestDbDir() {
    fs.removeDirectory(fs.join(dbPath, 'Person'));
    fs.removeDirectory(dbPath);
}
