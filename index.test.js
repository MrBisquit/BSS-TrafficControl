const index = require("./index");
const threatCheck = require("./lib/threatCheck");

test('Test the checkExists function.', () => {
    expect(index.checkExists("Hello")).toBe(true);
    expect(index.checkExists(1)).toBe(true);

    expect(index.checkExists("")).toBe(false);
    expect(index.checkExists(null)).toBe(false);
    expect(index.checkExists(undefined)).toBe(false);
});

test('Test threat checking', () => {
    const data = [
        {
            data : {
                request : {
                    request : {
                        url : "/"
                    }
                }
            },
            expect : {
                threat : false,
                ctl : 0,
                threats : []
            }
        },
        {
            data : {
                request : {
                    request : {
                        url : "/SELECT"
                    }
                }
            },
            expect : {
                threat : false,
                ctl : 0.05,
                threats : [{ item : "SELECT", level : 0.5 }]
            }
        },
        {
            data : {
                request : {
                    request : {
                        url : "/SELECT USER/"
                    }
                }
            },
            expect : {
                threat : false,
                ctl : 0.1,
                threats : [{ item : "SELECT", level : 0.5 },
                { item : "USER", level : 0.5 },]
            }
        }
    ]

    data.forEach(item => {
        expect(threatCheck(item.data)).toStrictEqual(item.expect);
    });
});