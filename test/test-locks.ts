import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
import * as assert from "assert";
import * as asyncio from '../main'
import * as os from 'os'
// ensure

@suite class AsyncIO {

  @test async "Locking simple file"() {
    const release = await asyncio.Lock.exclusive(__filename);

    assert.equal(await asyncio.Lock.check(__filename), true);
    release();
    assert.equal(await asyncio.Lock.check(__filename), false);

  }

  @test async "Locking - does lock deny access"() {
    const release = await asyncio.Lock.exclusive(__filename);
    let threw = false;
    try {
      const release2 = await asyncio.Lock.exclusive(__filename);
    } catch (e) {
      threw = true;
    }
    assert.equal(threw, true);

    release();
    assert.equal(await asyncio.Lock.check(__filename), false);
  }

  @test async "ReadLock simple file"() {

    // it should be not locked now
    assert.equal(await asyncio.Lock.check(__filename), false);

    const release1 = await asyncio.Lock.read(__filename);

    const release2 = await asyncio.Lock.read(__filename);

    const release3 = await asyncio.Lock.read(__filename);

    // it should be locked now
    assert.equal(await asyncio.Lock.check(__filename), true);

    let threw = false;
    try {
      // should fail getting write lock here.
      await asyncio.Lock.exclusive(__filename);
    } catch (e) {
      threw = true;
    }
    assert.equal(threw, true);


    release1();
    release2();
    release3();

    const release4 = await asyncio.Lock.exclusive(__filename);
    assert.equal(await asyncio.Lock.check(__filename), true);
    release4();
    assert.equal(await asyncio.Lock.check(__filename), false);
  }

}