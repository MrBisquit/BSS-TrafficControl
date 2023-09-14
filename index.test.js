const index = require("./index");

test('Test the checkExists function.', () => {
    expect(index.checkExists("Hello")).toBe(true);
    expect(index.checkExists(1)).toBe(true);

    expect(index.checkExists("")).toBe(false);
    expect(index.checkExists(null)).toBe(false);
    expect(index.checkExists(undefined)).toBe(false);
});